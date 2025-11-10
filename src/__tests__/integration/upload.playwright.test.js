/**
 * @jest-environment node
 */

// Playwright integration is opt-in. To run locally set RUN_PLAYWRIGHT_INTEGRATION=1
// Example (PowerShell):
//  $env:RUN_PLAYWRIGHT_INTEGRATION = '1'
//  npx jest src/__tests__/integration/upload.playwright.test.js -i --runInBand
import { chromium } from 'playwright'

const runIntegration = !!process.env.RUN_PLAYWRIGHT_INTEGRATION

if (!runIntegration) {
  test.skip('playwright integration (skipped by default)', () => {})
} else {
  describe('upload conversion integration (playwright)', () => {
    let browser
    let context
    let page

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

      try {
        const persistentProfile = process.env.PLAYWRIGHT_USER_DATA_DIR
        if (persistentProfile) {
          console.log('Playwright: using persistent user data dir:', persistentProfile)
          context = await chromium.launchPersistentContext(persistentProfile, { headless: true })
          // prefer the first existing page if any
          page = context.pages()[0] || (await context.newPage())
        } else {
          browser = await chromium.launch({ headless: true })
          context = await browser.newContext()
          page = await context.newPage()
        }
        await page.goto('http://localhost:3000/upload', { waitUntil: 'load', timeout: 60000 })
        console.log('Playwright: navigated to /upload')
        try {
          const bodyText = await page.$eval('body', b => b.innerText || '')
          console.log('Playwright: body text start:', bodyText.slice(0, 500))
          if (bodyText.includes('Sign In Required')) {
            const hint = persistentProfile ? `Make sure the profile at ${persistentProfile} is signed in before running the test.` : 'Run the test with a persistent profile by setting PLAYWRIGHT_USER_DATA_DIR to a profile path that has an authenticated session.'
            throw new Error(`Playwright: page indicates Sign In is required — the test needs an authenticated session. ${hint}`)
          }
        } catch {
          console.warn('Playwright: failed to read body text for diagnostics')
        }
      } catch (err) {
        console.error('Playwright launch or navigation failed:', err && err.message ? err.message : err)
        throw err
      }
    }, 60000)

    afterAll(async () => {
      try { if (browser) await browser.close() } catch {}
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
      await page.selectOption('select[title="Select currency"]', 'NGN')

      // Wait for the value to change from 10 to something else (conversion applied)
      await page.waitForFunction(() => {
        const inp = document.querySelector('input[type="number"]')
        return inp && inp.value !== '10'
      }, { timeout: 15000 })

      const newVal = await page.$eval('input[type="number"]', el => el.value)
      expect(newVal).not.toBe('10')
  }, 300000)
  })
}
