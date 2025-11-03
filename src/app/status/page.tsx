export const dynamic = 'force-dynamic'
import styles from './status.module.css'

async function getStatus() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/status`, {
      // Fallback to relative URL if NEXT_PUBLIC_APP_URL is not set
      cache: 'no-store',
      next: { revalidate: 0 },
    }).catch(async () => {
      // Retry with relative path
      return fetch('/api/status', { cache: 'no-store' })
    })

    if (!res || !res.ok) {
      return { ok: false, error: `Request failed with status ${res?.status}` }
    }
    return res.json()
  } catch (e: unknown) {
    if (e instanceof Error) {
      return { ok: false, error: e.message }
    }
    return { ok: false, error: 'Unknown error' }
  }
}

export default async function StatusPage() {
  const status = await getStatus()

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>System status</h1>
      <p className={styles.subtitle}>
        Quick health check for environment and database connectivity.
      </p>

      <div className={styles.card}>
        <pre className={styles.pre}>
{JSON.stringify(status, null, 2)}
        </pre>
      </div>

      <div className={styles.note}>
        <p>Tip: add NEXT_PUBLIC_APP_URL to .env.local (e.g., http://localhost:3000) for absolute fetches.</p>
      </div>
    </main>
  )
}
