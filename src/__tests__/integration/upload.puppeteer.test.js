// Puppeteer integration is opt-in. To run locally set RUN_PUPPETEER_INTEGRATION=1
// Example (PowerShell):
//  $env:RUN_PUPPETEER_INTEGRATION = '1'
//  npx jest src/__tests__/integration/upload.puppeteer.test.js -i --runInBand
import puppeteer from 'puppeteer'
import fs from 'fs'
import os from 'os'
import path from 'path'

const runIntegration = !!process.env.RUN_PUPPETEER_INTEGRATION

if (!runIntegration) {
  test.skip('puppeteer integration (skipped by default)', () => {})
} else {
  describe('upload conversion integration (puppeteer)', () => {
    let browser
    let page
    let tmpProfileDir

    async function launchWithRetries(maxAttempts = 3) {
      let lastErr
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let profileDir
        try {
          // Create a unique temp profile directory for each launch attempt to
          // avoid collisions with leftover or concurrently-used profiles.
          profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_dev_chrome_profile-'))
          const b = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // Use the freshly-created profile dir so Puppeteer won't try to reuse
            // a directory that other Chrome processes may be holding.
            userDataDir: profileDir,
          })
          // remember for cleanup
          tmpProfileDir = profileDir
          return { browser: b }
        } catch (err) {
          lastErr = err
          // cleanup profile dir if it exists and failed to launch
          try { if (profileDir) fs.rmSync(profileDir, { recursive: true, force: true }) } catch {}
          // small backoff before retry
          await new Promise(r => setTimeout(r, 300))
        }
      }
      throw lastErr
    }

    beforeAll(async () => {
      // Only run if dev server is available
      try {
        const res = await fetch('http://localhost:3000/upload')
        if (!res.ok) {
          console.warn('Dev server not ready (status != 200), skipping integration test')
          return
        }
      } catch {
        console.warn('Dev server not ready, skipping integration test')
        return
      }

  // Try launching Puppeteer with retries; don't pass a profile dir to avoid locks
  const result = await launchWithRetries(4)
  browser = result.browser
  page = await browser.newPage()
      await page.goto('http://localhost:3000/upload', { waitUntil: 'networkidle2' })
    }, 60000)

    afterAll(async () => {
      try { if (browser) await browser.close() } catch {}
      if (tmpProfileDir) { try { fs.rmSync(tmpProfileDir, { recursive: true, force: true }) } catch {} }
    })

    test('converts price when currency changes', async () => {
      if (!page) return

      // Wait for price input to appear and set a value
      await page.waitForSelector('input[type="number"]')
      const inputs = await page.$$('input[type="number"]')
      const priceInput = inputs[0]
      await priceInput.click({ clickCount: 3 })
      await priceInput.type('10')

      // Change currency select to NGN (this should trigger conversion)
      await page.select('select[title="Select currency"]', 'NGN')

      // Wait for the value to change from 10 to something else (conversion applied)
      await page.waitForFunction(() => {
        const inp = document.querySelector('input[type="number"]')
        return inp && inp.value !== '10'
      }, { timeout: 15000 })

      const newVal = await page.evaluate(() => (document.querySelector('input[type="number"]')).value)
      expect(newVal).not.toBe('10')
    }, 30000)
  })
}
