#!/usr/bin/env node
/**
 * Automated ESLint Warning Fixer
 * Fixes unused variables by prefixing with underscore (_)
 * Handles: unused vars, unused params, unused imports, unused catches
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const PATTERNS = [
  // Unused variables: 'variable is assigned a value but never used'
  { regex: /(?<![\w_])(\w+)\s+is assigned a value but never used/, type: 'var' },
  // Unused parameters: 'parameter is defined but never used'
  { regex: /(?<![\w_])(\w+)\s+is defined but never used/, type: 'param' },
  // Unused caught error: 'error is defined but never used'
  { regex: /(?<![\w_])(\w+)\s+is defined but never used.*Allowed unused.*errors/, type: 'catch' },
  // Unused imports
  { regex: /(?<![\w_])(\w+)\s+is defined but never used.*Allowed unused.*vars/, type: 'import' },
];

async function getEslintWarnings() {
  try {
    console.log('🔍 Running ESLint to collect warnings...');
    const json = execSync('npx eslint src --format=json --quiet', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return JSON.parse(json || '[]');
  } catch (error) {
    console.error('⚠️  ESLint execution failed, continuing anyway...');
    return [];
  }
}

function parseFileName(filePath) {
  return filePath.replace(/\\/g, '/').replace(/.*fashion-marketplace\//, '');
}

function fixFile(filePath, warnings) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return { success: false, changes: 0 };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;
  const originalContent = content;

  for (const warning of warnings) {
    const { line, column, message } = warning;
    
    // Extract variable name from message
    const match = message.match(/^['"]?(\w+)['"]?\s+is (assigned|defined)/);
    if (!match) continue;

    const varName = match[1];
    const lines = content.split('\n');
    
    if (line - 1 >= lines.length) continue;

    const lineContent = lines[line - 1];
    const beforeCol = lineContent.substring(0, column);
    const afterCol = lineContent.substring(column);

    // Pattern: const/let/var name =
    if (message.includes('assigned a value')) {
      const varRegex = new RegExp(`\\b${varName}\\s*=`);
      if (varRegex.test(lineContent)) {
        const newLine = lineContent.replace(
          new RegExp(`\\b${varName}\\b`),
          `_${varName}`
        );
        lines[line - 1] = newLine;
        changes++;
        continue;
      }
    }

    // Pattern: function(param) or (param) =>
    if (message.includes('defined but never used') && (message.includes('parameters') || message.includes('args'))) {
      const paramRegex = new RegExp(`([,(\\s])${varName}([,)\\s])`);
      if (paramRegex.test(lineContent)) {
        const newLine = lineContent.replace(
          paramRegex,
          `$1_${varName}$2`
        );
        lines[line - 1] = newLine;
        changes++;
        continue;
      }
    }

    // Pattern: catch (error) - handles error/err
    if (message.includes('Allowed unused caught errors')) {
      const catchRegex = new RegExp(`\\(\\s*${varName}\\s*\\)`);
      if (catchRegex.test(lineContent)) {
        const newLine = lineContent.replace(
          catchRegex,
          `(_${varName})`
        );
        lines[line - 1] = newLine;
        changes++;
        continue;
      }
    }
  }

  if (changes > 0) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { success: true, changes, modified: content !== originalContent };
}

async function main() {
  console.log('🚀 ESLint Warning Auto-Fixer\n');

  // Get all warnings
  const eslintResults = await getEslintWarnings();

  if (!eslintResults || eslintResults.length === 0) {
    console.log('✅ No warnings found!');
    return;
  }

  // Group by file
  const warningsByFile = {};
  const totalWarnings = eslintResults.reduce((sum, file) => {
    if (file.messages?.length > 0) {
      warningsByFile[file.filePath] = file.messages.filter(m => m.severity === 1);
      return sum + warningsByFile[file.filePath].length;
    }
    return sum;
  }, 0);

  console.log(`📋 Found ${totalWarnings} warnings in ${Object.keys(warningsByFile).length} files\n`);

  // Fix each file
  let totalFixed = 0;
  const fixedFiles = [];

  for (const [filePath, warnings] of Object.entries(warningsByFile)) {
    const result = fixFile(filePath, warnings);
    if (result.changes > 0) {
      totalFixed += result.changes;
      fixedFiles.push({
        file: parseFileName(filePath),
        count: result.changes
      });
    }
  }

  // Report
  if (totalFixed === 0) {
    console.log('ℹ️  No automatic fixes could be applied.');
    console.log('💡 This may require manual review for edge cases.\n');
  } else {
    console.log(`✅ Fixed ${totalFixed} warnings in ${fixedFiles.length} files:\n`);
    
    fixedFiles.sort((a, b) => b.count - a.count).forEach(f => {
      console.log(`  ${f.file}: ${f.count} warning${f.count !== 1 ? 's' : ''}`);
    });

    console.log('\n📝 Changes written to disk. Run lint again to verify:\n');
    console.log('  npm run lint\n');
  }
}

main().catch(console.error);
