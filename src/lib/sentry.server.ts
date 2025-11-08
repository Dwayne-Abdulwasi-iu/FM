// Minimal Sentry initializer for server-side code.
// This lazily imports @sentry/node only when SENTRY_DSN is set to avoid
// requiring the package in environments that don't need monitoring.
// To enable: `npm install @sentry/node` and set SENTRY_DSN in your environment.

// We'll keep Sentry typed as unknown to avoid a hard TypeScript dependency on
// @sentry/node. If you install @sentry/node, you can change this to the
// appropriate imported type for stronger typing.
let Sentry: unknown | null = null;

if (process.env.SENTRY_DSN) {
  // Dynamic import to avoid hard dependency at module load time.
  // We intentionally don't await here; initialization runs asynchronously.
  import('@sentry/node')
    .then((SentryNode) => {
      // Use `any` here for the call to init to avoid type errors when the
      // optional dependency isn't installed during dev/test.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (SentryNode as any).init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.05,
        environment: process.env.NODE_ENV || 'development',
      });
      Sentry = SentryNode;
    })
    .catch(() => {
      // If the package isn't installed or the import fails, don't crash the app.
      // eslint-disable-next-line no-console
      console.warn('Sentry failed to initialize. Install @sentry/node and set SENTRY_DSN to enable monitoring.');
    });
}

export default Sentry;
