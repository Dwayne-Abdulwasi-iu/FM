#!/usr/bin/env node
/**
 * Simple Lucide Import Fixer
 * Removes underscores from lucide-react imports only
 */

import fs from 'fs';
import { execSync } from 'child_process';

// Get all TS/TSX files with lucide imports
const getFilesCmd = `Get-ChildItem -Path src -Recurse -Include "*.tsx", "*.ts" | % FullName`;
const files = execSync(getFilesCmd, { shell: 'powershell', encoding: 'utf-8' })
  .split('\n')
  .filter(f => f.trim());

console.log(`🔧 Fixing lucide-react imports...\n`);

let fixed = 0;
for (const file of files) {
  if (!file.trim()) continue;

  try {
    let content = fs.readFileSync(file, 'utf-8');
    const hadUnderscore = /from\s+['"]lucide-react['"].*_[A-Z]/.test(content);
    
    if (!hadUnderscore) continue;

    // Simple replace: remove underscores before icon names in lucide imports
    // This is a multi-line aware replace
    const lines = content.split('\n');
    let inLucideImport = false;
    let importStart = -1;
    let importEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("from 'lucide-react'") || lines[i].includes('from "lucide-react"')) {
        inLucideImport = false;
        importEnd = i;
        // Go backwards to find the opening brace
        for (let j = i; j >= 0; j--) {
          if (lines[j].includes('import')) {
            importStart = j;
            break;
          }
        }
        
        // Fix the import block
        if (importStart >= 0 && importEnd >= importStart) {
          for (let j = importStart; j <= importEnd; j++) {
            lines[j] = lines[j].replace(/_([A-Z]\w*)/g, '$1');
          }
          fixed++;
          break;
        }
      }
    }

    const newContent = lines.join('\n');
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf-8');
      console.log(`✅ ${file.split('\\').pop()}`);
    }
  } catch (err) {
    // ignore
  }
}

console.log(`\n✅ Fixed ${fixed} files`);
