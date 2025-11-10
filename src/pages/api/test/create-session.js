export default function handler(req, res) {
  // Guarded: only enabled when ENABLE_TEST_AUTH=1
  if (process.env.ENABLE_TEST_AUTH !== '1') {
    res.status(403).json({ error: 'test auth disabled' })
    return
  }

  // Set a simple test cookie that the client-side will accept (not HttpOnly)
  // This is purposely minimal: it only signals the client to treat the user as signed-in
  res.setHeader('Set-Cookie', 'TEST_AUTH=1; Path=/; SameSite=Lax')
  res.status(200).json({ ok: true })
}
