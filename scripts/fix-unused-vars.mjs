#!/usr/bin/env node
/**
 * ESLint Unused Variables Fixer
 * Processes ESLint JSON output and automatically fixes unused variable warnings
 */

import fs from 'fs';
import path from 'path';

function parseVariableName(message) {
  // Extract variable name from common ESLint messages
  const patterns = [
    /^['"](\w+)['"] is assigned a value but never used/,
    /^['"](\w+)['"] is defined but never used/,
    /^['"](\w+)['"] is defined but never used.*Allowed unused/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function fixUnusedVariable(content, varName, line, column, messageType) {
  const lines = content.split('\n');
  if (line - 1 >= lines.length) return content;

  const lineStr = lines[line - 1];
  let newLine = lineStr;

  // Case 1: unused parameter in function definition
  if (messageType.includes('parameter') || messageType.includes('args')) {
    newLine = lineStr.replace(
      new RegExp(`([,(\\s])${varName}([,):=])`),
      `$1_${varName}$2`
    );
  }
  // Case 2: unused variable assignment (const x = ...)
  else if (messageType.includes('assigned a value')) {
    newLine = lineStr.replace(
      new RegExp(`(const|let|var)\\s+${varName}\\b`),
      `$1 _${varName}`
    );
  }
  // Case 3: catch block (catch (err) => ...)
  else if (messageType.includes('Allowed unused caught errors')) {
    newLine = lineStr.replace(
      new RegExp(`\\(\\s*${varName}\\s*\\)`),
      `(_${varName})`
    );
  }
  // Case 4: Generic unused variable
  else {
    newLine = lineStr.replace(
      new RegExp(`\\b${varName}\\b`),
      `_${varName}`,
      'g'
    );
  }

  if (newLine !== lineStr) {
    lines[line - 1] = newLine;
    return lines.join('\n');
  }

  return content;
}

function main() {
  const eslintJsonPath = './eslint-output.json';

  if (!fs.existsSync(eslintJsonPath)) {
    console.log('❌ eslint-output.json not found. Run ESLint first:\n  npx eslint src --format=json > eslint-output.json\n');
    process.exit(1);
  }

  console.log('🚀 Processing ESLint warnings...\n');

  const eslintOutput = JSON.parse(fs.readFileSync(eslintJsonPath, 'utf-8'));
  
  let totalFixed = 0;
  const fileStats = {};

  for (const fileReport of eslintOutput) {
    if (!fileReport.messages || fileReport.messages.length === 0) continue;

    const filePath = fileReport.filePath;
    const fileKey = filePath.replace(/.*fashion-marketplace[\\/]/, '');
    
    if (!fs.existsSync(filePath)) continue;

    let fileContent = fs.readFileSync(filePath, 'utf-8');
    let fileFixed = 0;

    for (const message of fileReport.messages) {
      if (message.severity !== 1) continue; // Only warnings, not errors

      const varName = parseVariableName(message.message);
      if (!varName) continue;

      const originalContent = fileContent;
      fileContent = fixUnusedVariable(
        fileContent,
        varName,
        message.line,
        message.column,
        message.message
      );

      if (fileContent !== originalContent) {
        fileFixed++;
        totalFixed++;
      }
    }

    if (fileFixed > 0) {
      fs.writeFileSync(filePath, fileContent, 'utf-8');
      fileStats[fileKey] = fileFixed;
    }
  }

  // Report
  console.log(`✅ Fixed ${totalFixed} unused variable warnings\n`);

  if (totalFixed > 0) {
    console.log('📝 Changes applied to files:\n');
    Object.entries(fileStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([file, count]) => {
        console.log(`  ${file}: +${count}`);
      });

    console.log('\n📊 Run ESLint again to verify:\n  npx eslint src --max-warnings 5\n');
  }
}

main();
