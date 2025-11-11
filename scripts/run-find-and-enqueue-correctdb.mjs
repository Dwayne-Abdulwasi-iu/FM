#!/usr/bin/env node
import { config } from 'dotenv'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// Load .env.local if present to pick up envs for this script (but don't overwrite existing envs)
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
	config({ path: envPath })
}

const orig = process.env.DATABASE_URL || ''
if (!orig) { console.error('DATABASE_URL not set'); process.exit(1) }

let corrected = orig.replace(/^(mongo\+srv:\/\/)/i, 'mongodb+srv://').replace(/^(mongo:\/\/)/i, 'mongodb://')
if (corrected === orig) console.log('No correction needed for DATABASE_URL')
else console.log('Using corrected DATABASE_URL for this run')

const env = { ...process.env, DATABASE_URL: corrected }
const child = spawn(process.execPath, ['-r', 'dotenv/config', 'scripts/find-and-enqueue-thumbnail.mjs'], { env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
