#!/usr/bin/env node
/**
 * Batch Lucide Import Fixer
 * Finds all lucide-react imports with underscores and removes them
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function fixLucideInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Match lucide-react imports on single or multiple lines with underscored names
    const regex = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g;
    let newContent = content;
    let found = false;

    newContent = newContent.replace(regex, (match) => {
      // Check if this import contains underscored names
      if (!match.includes('_')) return match;
      
      // Remove underscores from the import names
      const fixed = match.replace(/\b_([A-Z][\w]*)\b/g, '$1');
      if (fixed !== match) found = true;
      return fixed;
    });

    if (found) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return true;
    }
  } catch (err) {
    // ignore
  }
  return false;
}

// Get all TS/TSX files
const getFilesCmd = `Get-ChildItem -Path src -Recurse -Include "*.tsx", "*.ts" -File | % FullName`;
let files = [];
try {
  files = execSync(getFilesCmd, { shell: 'powershell', encoding: 'utf-8' })
    .split('\n')
    .filter(f => f.trim());
} catch (err) {
  console.error('Error getting files:', err.message);
  process.exit(1);
}

console.log(`🔍 Scanning ${files.length} files for underscore-prefixed lucide imports...\n`);

let fixed = 0;
const fixedFiles = [];

for (const file of files) {
  if (!file.trim()) continue;
  
  if (fixLucideInFile(file)) {
    fixed++;
    fixedFiles.push(path.basename(file));
  }
}

if (fixed > 0) {
  console.log(`✅ Fixed ${fixed} files:\n`);
  fixedFiles.forEach(f => console.log(`  • ${f}`));
} else {
  console.log('No underscore-prefixed lucide imports found.');
}
