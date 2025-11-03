/* Quick Paystack connectivity check: env presence + simple API calls.
   Usage: node -r dotenv/config scripts/test-paystack.js dotenv_config_path=.env.local
*/
(async () => {
  const pretty = (o) => JSON.stringify(o, null, 2)
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

  let paystack
  try {
    paystack = require('paystack')(secret)
  } catch (e) {
    results.tests.push({ name: 'init', status: 'FAIL', error: String(e && e.message || e) })
    console.log(pretty(results))
    process.exit(3)
  }

  // Test 1: list banks (simple GET)
  try {
    const res = await paystack.misc.list_banks({ country: 'nigeria' })
    const ok = !!(res && res.status && Array.isArray(res.data))
    results.tests.push({ name: 'list_banks', status: ok ? 'PASS' : 'FAIL', count: Array.isArray(res?.data) ? res.data.length : 0 })
  } catch (e) {
    results.tests.push({ name: 'list_banks', status: 'FAIL', error: String(e && e.message || e) })
  }

  // Test 2: resolve account (expect validation error or specific API error for dummy account)
  try {
    await paystack.misc.resolve_account_number({ account_number: '0123456789', bank_code: '044' })
    // If it oddly succeeds, we still count the API reachable; real data shouldn't succeed
    results.tests.push({ name: 'resolve_account_number', status: 'API_RESPONDING' })
  } catch (e) {
    const msg = String(e && e.message || e)
    const expected = msg.toLowerCase().includes('could not resolve account name') || msg.toLowerCase().includes('invalid account number')
    results.tests.push({ name: 'resolve_account_number', status: expected ? 'PASS' : 'FAIL', error: expected ? undefined : msg })
  }

  // Aggregate
  const healthy = results.tests.every(t => t.status === 'PASS' || t.status === 'API_RESPONDING')
  results.summary = healthy ? 'HEALTHY' : 'ISSUES_DETECTED'
  console.log(pretty(results))
  process.exit(healthy ? 0 : 1)
})()
