#!/usr/bin/env node
/**
 * Direct Lucide Icon Name Replacer
 * Replaces _IconName with IconName in all files
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get all files
const cmd = `Get-ChildItem -Path src -Recurse -Include "*.tsx", "*.ts" -File | % FullName`;
let files = [];
try {
  files = execSync(cmd, { shell: 'powershell', encoding: 'utf-8' })
    .split('\n')
    .filter(f => f.trim());
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}

console.log(`🔧 Processing ${files.length} files...\n`);

const ICON_REPLACEMENTS = [
  ['_AlertTriangle', 'AlertTriangle'],
  ['_Calendar', 'Calendar'],
  ['_Truck', 'Truck'],
  ['_AlertCircle', 'AlertCircle'],
  ['_X', 'X'],
  ['_Filter', 'Filter'],
  ['_Users', 'Users'],
  ['_ChevronDown', 'ChevronDown'],
  ['_XCircle', 'XCircle'],
  ['_getDaysInWarehouse', 'getDaysInWarehouse'],
  ['_getServerSession', 'getServerSession'],
  ['_Image', 'Image'],
  ['_useEffect', 'useEffect'],
  ['_Image', 'Image'],
  ['_PaymentProcessor', 'PaymentProcessor'],
  ['_isMainAdmin', 'isMainAdmin'],
];

let totalFixed = 0;
const fixedFiles = new Set();

for (const file of files) {
  if (!file.trim()) continue;

  try {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    for (const [bad, good] of ICON_REPLACEMENTS) {
      if (content.includes(bad)) {
        content = content.split(bad).join(good);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
      fixedFiles.add(path.basename(file));
    }
  } catch (err) {
    // ignore
  }
}

console.log(`✅ Fixed ${fixedFiles.size} files`);
if (fixedFiles.size > 0) {
  Array.from(fixedFiles).forEach(f => console.log(`  • ${f}`));
}
