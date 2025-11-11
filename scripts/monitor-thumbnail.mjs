#!/usr/bin/env node
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

const DESIGN_ID = process.env.MONITOR_DESIGN_ID || 'cmhtnjrf00001zzc75swvzhtq'
// Allow multiple base URLs (comma-separated) to try if server binds differently
const baseUrlsEnv = process.env.MONITOR_BASE_URLS || process.env.MONITOR_BASE_URL || 'http://localhost:3000'
const BASE_URLS = baseUrlsEnv.split(',').map(s => s.trim()).filter(Boolean)
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10)
const FAILURE_THRESHOLD = parseInt(process.env.FAILURE_THRESHOLD || '3', 10)
const ALERT_COMMAND = process.env.ALERT_COMMAND // optional shell command to run when threshold reached
const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK // optional HTTP webhook to POST to

let failures = 0
let alerted = false

const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
const logFile = path.join(logDir, 'monitor.log')

function appendLog(line) {
  const out = `${new Date().toISOString()} ${line}\n`
  fs.appendFile(logFile, out, (err) => { if (err) console.error('Failed to write monitor log', err) })
}

function now() { return new Date().toISOString() }

async function checkOnce() {
  try {
    let res = null
    let txt = ''
    let usedBase = null
    // Try each configured base URL until one responds OK
    for (const b of BASE_URLS) {
      try {
        res = await fetch(`${b.replace(/\/$/, '')}/designs/${DESIGN_ID}`)
        if (res && res.ok) {
          usedBase = b
          txt = await res.text()
          break
        }
      } catch (e) {
        // ignore and try next base URL
      }
    }
    if (!res || !res.ok) throw new Error('no reachable base URL')

    // success if we see an uploads thumbnail (conservative)
    const hasUploadsThumb = /\/uploads\/[^"'<>\\s]+_thumb\.(jpg|jpeg|png)/i.test(txt)
    if (hasUploadsThumb) {
      if (failures > 0 || alerted) {
        console.log(`${now()} [monitor] recovered: thumbnail present (via ${usedBase})`)
        appendLog('[RECOVERY] thumbnail present for ' + DESIGN_ID + ' via ' + usedBase)
      }
      failures = 0
      alerted = false
    } else {
      failures += 1
      console.warn(`${now()} [monitor] thumbnail missing for ${DESIGN_ID} (failure ${failures}/${FAILURE_THRESHOLD})`)
      appendLog('[MISSING] failure ' + failures + ' for ' + DESIGN_ID + ' checked via ' + (usedBase || 'none'))
      if (failures >= FAILURE_THRESHOLD && !alerted) {
        alerted = true
        const msg = `${now()} [monitor] ALERT: design ${DESIGN_ID} missing thumbnail after ${failures} checks`
        console.error(msg)
        appendLog('[ALERT] ' + msg)
        if (ALERT_COMMAND) {
          exec(ALERT_COMMAND, (err, stdout) => {
            if (err) console.error(`${now()} [monitor] alert command failed:`, err)
            else console.log(`${now()} [monitor] alert command stdout:`, stdout)
          })
        }
        if (ALERT_WEBHOOK) {
          try {
            await fetch(ALERT_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ designId: DESIGN_ID, message: msg }) })
            console.log(`${now()} [monitor] alert webhook posted`)
            appendLog('[ALERT] webhook posted')
          } catch (e) {
            console.error(`${now()} [monitor] failed to post webhook:`, e.message || e)
            appendLog('[ALERT] webhook failed: ' + (e.message || e))
          }
        }
      }
    }
  } catch (err) {
    failures += 1
    console.error(`${now()} [monitor] error fetching page:`, err.message || err, `(failure ${failures}/${FAILURE_THRESHOLD})`)
    if (failures >= FAILURE_THRESHOLD && !alerted) {
      alerted = true
      const msg = `${now()} [monitor] ALERT: unable to reach ${BASE_URL} or render page for design ${DESIGN_ID}`
      console.error(msg)
      if (ALERT_COMMAND) exec(ALERT_COMMAND)
    }
  }
}

console.log(`${now()} [monitor] starting monitor for design ${DESIGN_ID} -> ${BASE_URL}/designs/${DESIGN_ID}`)
checkOnce()
setInterval(checkOnce, POLL_INTERVAL)
