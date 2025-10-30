#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, {encoding: 'utf8'}).trim();
  } catch (_e) {
    void _e
    return '';
  }
}

const tracked = run('git ls-files').split(/\r?\n/).filter(Boolean);
if (!tracked.length) {
  console.log('No tracked files found.');
  process.exit(0);
}

const patterns = [
  {rx: /sk_live_[0-9a-zA-Z._-]{8,}/g, repl: 'sk_live_REDACTED'},
  {rx: /sk_test_[0-9a-zA-Z._-]{8,}/g, repl: 'sk_test_REDACTED'},
  {rx: /mongodb(\+srv)?:\/\/[^\s'"`]+/g, repl: 'mongodb+srv://<USER>:<PASS>@<CLUSTER>/<DB>?<OPTIONS>'},
  {rx: /AKIA[0-9A-Z]{16}/g, repl: 'AKIA_REDACTED'},
  {rx: /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA )?PRIVATE KEY-----/g, repl: 'REDACTED_PRIVATE_KEY'}
];

const changed = [];

for (const file of tracked) {
  // skip binary-ish files
  const ext = path.extname(file).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.zip', '.lock'].includes(ext)) continue;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { void e; continue; }
  let out = text;
  for (const p of patterns) {
    out = out.replace(p.rx, p.repl);
  }
  if (out !== text) {
    fs.writeFileSync(file, out, 'utf8');
    changed.push(file);
    console.log('Sanitized:', file);
  }
}

if (!changed.length) {
  console.log('No tracked files required sanitization.');
  process.exit(0);
}

try {
  run(`git add ${changed.map(f => JSON.stringify(f)).join(' ')}`);
  run('git commit -m "chore(secrets): sanitize tracked files - replace live tokens with placeholders"');
  console.log('Committed sanitized files.');
  } catch (_e) {
    void _e
    console.error('Failed to commit sanitized files. Please review and commit manually.');
  }

console.log('Done. Run `node scripts/scan-secrets.js` to re-check.');
