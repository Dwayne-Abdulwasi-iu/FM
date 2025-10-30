#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ignoreDirs = new Set(['.git', 'node_modules', '.next', 'dist']);

const patterns = [
  {name: 'MongoDB URI', rx: /mongodb(\+srv)?:\/\/[\w:@.\-\/\?=,%]+/gi},
  {name: 'AWS Access Key ID', rx: /AKIA[0-9A-Z]{16}/g},
  {name: 'Private Key', rx: /-----BEGIN (RSA )?PRIVATE KEY-----/g},
  {name: 'Stripe live secret', rx: /sk_live_[0-9a-zA-Z]{24,}/g},
  {name: 'Stripe test secret', rx: /sk_test_[0-9a-zA-Z._-]{8,}/g},
  {name: 'Paystack secret', rx: /sk_test_[0-9a-zA-Z]{10,}/g},
  {name: 'Webhook secret (whsec)', rx: /whsec_[0-9a-zA-Z]{8,}/g},
  {name: 'ENV-style var', rx: /\b(DATABASE_URL|NEXTAUTH_SECRET|STRIPE_SECRET_KEY|PAYSTACK_SECRET_KEY|CLOUDINARY_API_SECRET)\b/gi}
];

const results = [];

function isBinary(contents) {
  for (let i = 0; i < Math.min(24, contents.length); i++) {
    if (contents[i] === 0) return true;
  }
  return false;
}

function scanFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath);
    if (isBinary(raw)) return;
    const text = raw.toString('utf8');
    patterns.forEach(p => {
      let m;
      const seen = new Set();
      while ((m = p.rx.exec(text)) !== null) {
        const match = m[0].slice(0, 200);
        if (seen.has(match)) continue;
        seen.add(match);
        results.push({file: filePath, type: p.name, match});
      }
    });
  } catch (e) { void e }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else scanFile(full);
  }
}

console.log('Scanning repository for potential secrets...');
walk(root);

if (results.length === 0) {
  console.log('No obvious secrets found by heuristics. This is not a guarantee.');
  process.exit(0);
}

console.log('\nPotential secrets found:');
results.forEach(r => {
  console.log(`- [${r.type}] ${r.file}: ${r.match}`);
});
console.log('\nReview the files listed and rotate any real secrets.');
process.exit(0);
