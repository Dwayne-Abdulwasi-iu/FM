// Minimal Sentry initializer for server-side code.
// This lazily imports @sentry/node only when SENTRY_DSN is set to avoid
// requiring the package in environments that don't need monitoring.
// To enable: `npm install @sentry/node` and set SENTRY_DSN in your environment.

// We'll keep Sentry typed as unknown to avoid a hard TypeScript dependency on
// @sentry/node. If you install @sentry/node, you can change this to the
// appropriate imported type for stronger typing.
let Sentry: unknown | null = null;

if (process.env.SENTRY_DSN) {
  // Lazily require @sentry/node at runtime using eval(require) to avoid bundlers
  // statically resolving the dependency when it's not installed. This keeps
  // the package optional for dev environments.
  try {
    // eslint-disable-next-line no-eval
    const req = eval('require')
    const SentryNode = req('@sentry/node')
    // Avoid using explicit `any` — call init via a minimal typed shape so we
    // don't introduce a hard dependency on @sentry/node types.
    ;(SentryNode as { init?: (opts: unknown) => void }).init?.({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.05,
      environment: process.env.NODE_ENV || 'development',
    })
    Sentry = SentryNode
  } catch {
    // If the package isn't installed or the require fails, don't crash the app.
    // eslint-disable-next-line no-console
    console.warn('Sentry failed to initialize. Install @sentry/node and set SENTRY_DSN to enable monitoring.')
  }
}

export default Sentry;
