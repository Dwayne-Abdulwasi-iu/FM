#!/usr/bin/env node
import 'dotenv/config'
import { spawn } from 'child_process'

const orig = process.env.DATABASE_URL || ''
if (!orig) { console.error('DATABASE_URL not set'); process.exit(1) }

let corrected = orig.replace(/^(mongo\+srv:\/\/)/i, 'mongodb+srv://').replace(/^(mongo:\/\/)/i, 'mongodb://')
if (corrected === orig) console.log('No correction needed for DATABASE_URL')
else console.log('Using corrected DATABASE_URL for this run')

const env = { ...process.env, DATABASE_URL: corrected }
const child = spawn(process.execPath, ['-r', 'dotenv/config', 'scripts/fix-cloudinary-mongo-client.mjs'], { env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
