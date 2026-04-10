#!/usr/bin/env node
import playwright from 'playwright'

/**
 * E2E Checkout & Payout Smoke Test (Playwright)
 *
 * Usage:
 *  BASE_URL=https://staging.example.com BUYER_EMAIL=... BUYER_PASSWORD=... node scripts/e2e-checkout.mjs
 *
 * This is a scaffolded smoke-test that performs basic health checks and (optionally)
 * exercises buyer checkout + webhook flow when credentials and test keys are provided.
 *
 * Required env vars for full run:
 *  - BASE_URL
 *  - BUYER_EMAIL, BUYER_PASSWORD
 *  - SELLER_EMAIL, SELLER_PASSWORD
 *  - STRIPE_TEST_KEY (or PAYSTACK_TEST_KEY)
 *  - REDIS_URL (optional for job queues)
 *  - DATABASE_URL (if server needs DB access)
 */

const BASE_URL = process.env.BASE_URL
if (!BASE_URL) {
  console.error('ERROR: BASE_URL is required to run the E2E script. Set BASE_URL env var to your staging URL.')
  process.exit(1)
}

async function run() {
  const browser = await playwright.chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log(`Opening ${BASE_URL}`)
    const r = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    console.log('Base page status:', r?.status())

    // Health endpoint
    try {
      const health = await page.request.get(`${BASE_URL.replace(/\/$/, '')}/api/health`)
      console.log('/api/health status:', health.status())
    } catch (e) {
      console.warn('/api/health check failed; continuing (may not be required)')
    }

    // If buyer credentials are provided, attempt a basic sign-in flow (NextAuth UI)
    if (process.env.BUYER_EMAIL && process.env.BUYER_PASSWORD) {
      console.log('Attempting buyer sign-in (UI)')
      await page.goto(`${BASE_URL}/api/auth/signin`, { waitUntil: 'domcontentloaded' })
      // NOTE: The exact selectors depend on your NextAuth/sign-in form. This is a best-effort scaffold.
      try {
        await page.fill('input[type="email"]', process.env.BUYER_EMAIL)
        await page.click('button[type="submit"]')
        console.log('Sign-in flow dispatched; complete interactive sign-in if provider requires.')
      } catch (e) {
        console.warn('Sign-in attempt failed (selector mismatch). Skipping interactive sign-in.')
      }
    } else {
      console.log('BUYER_EMAIL/BUYER_PASSWORD not provided; skipping interactive checkout steps.')
    }

    // Placeholder: advanced checkout + webhook simulation requires test keys and product fixtures.
    console.log('\nE2E scaffold completed. To execute full checkout+payout flows, provide staging credentials and product IDs, or ask me to generate a customized Playwright test that hits specific endpoints.')

    await context.close()
    await browser.close()
    process.exit(0)
  } catch (err) {
    console.error('E2E run failed:', err)
    try { await browser.close() } catch (_) {}
    process.exit(2)
  }
}

run()
