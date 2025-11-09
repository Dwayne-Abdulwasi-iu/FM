import Sentry from '@/lib/sentry.server'

export async function GET() {
  // This route intentionally throws to verify Sentry is working.
  // Visit /api/sentry-test in your running app (or call via curl/postman) to trigger.
  try {
    throw new Error('Sentry test - intentional error')
  } catch (err) {
    // If Sentry is initialized, capture the exception. Don't include secrets.
    try {
      const sentryClient = Sentry as unknown as { captureException?: (e: unknown) => void }
      if (sentryClient?.captureException) {
        sentryClient.captureException(err)
      }
    } catch (captureErr) {
      // swallow capture errors to not mask the original test
      console.warn('Sentry capture failed', captureErr)
    }

    // Re-throw the error so Next.js returns a 500 and you can observe the response
    throw err
  }
}
