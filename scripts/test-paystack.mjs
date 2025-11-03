/* Quick Paystack connectivity check: env presence + simple API calls.
   Usage (PowerShell):
   node -r dotenv/config scripts/test-paystack.mjs dotenv_config_path=.env.local
*/
import paystackFactory from 'paystack'

const pretty = (o) => JSON.stringify(o, null, 2)

async function main() {
  const secret = process.env.PAYSTACK_SECRET_KEY
  const pub = process.env.PAYSTACK_PUBLIC_KEY

  const results = { ts: new Date().toISOString(), env: {}, tests: [] }
  results.env.PAYSTACK_SECRET_KEY = secret && secret !== 'sk_test_REDACTED' ? 'SET' : 'MISSING_OR_PLACEHOLDER'
  results.env.PAYSTACK_PUBLIC_KEY = pub && pub !== 'pk_test_your_paystack_public_key_here' ? 'SET' : 'MISSING_OR_PLACEHOLDER'

  const allEnvOk = Object.values(results.env).every((v) => v === 'SET')
  if (!allEnvOk) {
    results.tests.push({ name: 'env', status: 'FAIL', reason: 'Missing Paystack keys' })
    console.log(pretty(results))
    process.exit(2)
  }

  const paystack = paystackFactory(secret)

  // Test 1: list banks (simple GET)
  try {
    const res = await paystack.misc.list_banks({ country: 'nigeria' })
    const ok = !!(res && res.status && Array.isArray(res.data))
    results.tests.push({ name: 'list_banks', status: ok ? 'PASS' : 'FAIL', count: Array.isArray(res?.data) ? res.data.length : 0 })
  } catch (e) {
    results.tests.push({ name: 'list_banks', status: 'FAIL', error: String(e && e.message || e) })
  }

  // Optional: more API calls can be added here for deeper checks if needed.

  // Aggregate
  const healthy = results.tests.every(t => t.status === 'PASS' || t.status === 'API_RESPONDING')
  results.summary = healthy ? 'HEALTHY' : 'ISSUES_DETECTED'
  console.log(pretty(results))
  process.exit(healthy ? 0 : 1)
}

main().catch((e) => {
  console.error('Unexpected error:', e?.message || e)
  process.exit(99)
})
