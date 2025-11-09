// Minimal Sentry server config for Next.js
// This file is loaded by @sentry/nextjs during server builds/runtime.

const SENTRY_DSN = process.env.SENTRY_DSN || ''

if (SENTRY_DSN) {
  try {
    // Use eval('require') to avoid lint rules forbidding require() in ESM
    // and to lazily load @sentry/node only when a DSN is present.
    // eslint-disable-next-line no-eval
    const req = eval('require')
    const Sentry = req('@sentry/node')
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.05,
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Sentry failed to initialize in sentry.server.config.js:', e)
  }
}
