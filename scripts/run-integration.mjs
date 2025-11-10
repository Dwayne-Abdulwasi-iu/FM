#!/usr/bin/env node
import { spawnSync } from 'child_process'

// Simple integration test runner script. It sets RUN_INTEGRATION=1 and
// executes jest against the integration tests folder with sensible defaults.
// Usage:
//   node scripts/run-integration.mjs         # run integration tests once
//   node scripts/run-integration.mjs --watch # pass extra args to jest

const args = process.argv.slice(2)
const jestArgs = ['jest', 'src/__tests__/integration', '-i', '--runInBand', ...args]

const env = { ...process.env, RUN_INTEGRATION: '1' }

console.log('Running integration tests with RUN_INTEGRATION=1')
console.log('Command: npx', jestArgs.join(' '))

const res = spawnSync('npx', jestArgs, { stdio: 'inherit', env })
process.exit(res.status ?? 1)
