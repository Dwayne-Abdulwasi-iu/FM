# E2E Runbook — Playwright Checkout/Payout

Purpose
- Describe how to run Playwright E2E tests against staging and what secrets are required.

Required repository secrets
- `STAGING_URL` — Base URL for the staging instance (e.g. https://staging.yourapp.com)
- `STRIPE_TEST_KEY` — Stripe test secret key (for USD flows)
- `PAYSTACK_TEST_KEY` — Paystack test secret key (for NGN flows)
- `DATABASE_URL` — staging DB connection string (read-only or test DB)
- `REDIS_URL` — staging Redis (if job queues are used by tests)
- `NEXTAUTH_SECRET` — NextAuth secret used by staging
- `EMAIL_FROM` — optional, used by email-related flows

How to add secrets
1. Go to your repository Settings → Secrets → Actions → New repository secret.
2. Add the keys above with values for your staging environment.

Running tests locally (Windows PowerShell)
1. Export env vars in your shell (PowerShell example):

```powershell
$env:STAGING_URL = 'https://staging.example.com'
$env:STRIPE_TEST_KEY = 'sk_test_...'
$env:PAYSTACK_TEST_KEY = 'sk_test_...'
$env:DATABASE_URL = 'mongodb+srv://...'
$env:REDIS_URL = 'redis://...'
$env:NEXTAUTH_SECRET = 'replace-with-secret'
npm run test:e2e
```

Or run the scaffold directly:

```powershell
node scripts/e2e-checkout.mjs
```

Notes and preconditions
- Ensure both buyer and seller test accounts exist on staging and have known credentials.
- For payment providers, make sure test cards or test payment methods are enabled for the provided keys.
- Webhook endpoints used by the tests must be reachable by the provider (or use emulators / webhook forwarders).
- The Playwright scaffold assumes the `test:e2e` npm script exists and runs `scripts/e2e-checkout.mjs`.

Troubleshooting
- If tests fail due to missing data, seed staging DB or update test accounts referenced in the script.
- If webhooks are not firing, verify webhook signing keys and that the staging server can receive external requests.

CI (GitHub Actions)
- The workflow `.github/workflows/e2e-playwright.yml` will run `npm run test:e2e` and uses the secrets listed above.
- Trigger manually from the Actions tab using the `Run workflow` button.

Security
- Only add test keys/secrets for staging; never put production keys in repo secrets for E2E runs.
