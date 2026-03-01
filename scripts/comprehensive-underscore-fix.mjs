#!/usr/bin/env node
/**
 * Fix all underscore-prefixed names caused by the aggressive auto-fixer
 * Maps bad names back to their correct originals
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Exact list of replacements needed
const REPLACEMENTS = [
  // Lucide icons
  ['_Trash2', 'Trash2'],
  ['_AlertTriangle', 'AlertTriangle'],
  ['_Calendar', 'Calendar'],
  ['_Truck', 'Truck'],
  ['_X', 'X'],
  ['_Filter', 'Filter'],
  ['_Users', 'Users'],
  ['_ChevronDown', 'ChevronDown'],
  ['_XCircle', 'XCircle'],
  ['_AlertCircle', 'AlertCircle'],
  
  // Boutique constants (these were wrong constant names in imports)
  ['SHIPPINGCARRIERS', 'SHIPPING_CARRIERS'],
  ['STANDARDSIZES', 'STANDARD_SIZES'],
  ['GENDEROPTIONS', 'GENDER_OPTIONS'],
  ['SEOCONFIGS', 'SEO_CONFIGS'],
  
  // Functions
  ['_getDaysInWarehouse', 'getDaysInWarehouse'],
  ['_deleteFromCloudinary', 'deleteFromCloudinary'],
  ['_getServerSession', 'getServerSession'],
  ['_isMainAdmin', 'isMainAdmin'],
  ['_isEmailConfigured', 'isEmailConfigured'],
  
  // Types
  ['_PaymentProcessor', 'PaymentProcessor'],
];

// Get all TS/TSX files
const cmd = `Get-ChildItem -Path src -Recurse -Include "*.tsx", "*.ts" -File | % FullName`;
let files = [];
try {
  files = execSync(cmd, { shell: 'powershell', encoding: 'utf-8' })
    .split('\n')
    .filter(f => f.trim());
} catch (err) {
  console.error('Error getting files:', err.message);
  process.exit(1);
}

console.log(`🔧 Processing ${files.length} files...\n`);

let totalFixed = 0;
const fixedFiles = new Set();

for (const file of files) {
  if (!file.trim()) continue;

  try {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    for (const [bad, good] of REPLACEMENTS) {
      // Use word boundary to avoid partial matches
      const regex = new RegExp(`\\b${bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, good);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
      fixedFiles.add(path.basename(file));
      totalFixed++;
    }
  } catch (err) {
    // ignore
  }
}

console.log(`✅ Fixed ${fixedFiles.size} files totaling ${totalFixed} replacements\n`);

if (fixedFiles.size > 0) {
  console.log('Fixed files:');
  Array.from(fixedFiles)
    .sort()
    .slice(0, 20)
    .forEach(f => console.log(`  • ${f}`));
  if (fixedFiles.size > 20) {
    console.log(`  ... and ${fixedFiles.size - 20} more`);
  }
}
