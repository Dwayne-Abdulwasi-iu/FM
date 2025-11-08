import { NextRequest, NextResponse } from 'next/server'

// Redirect server requests for /profile/designs -> /profile#designs
// This provides backwards compatibility for old links that used a nested path.
export async function GET(request: NextRequest) {
  try {
    const dest = new URL('/profile#designs', request.url).toString()
    // use 307 to preserve method semantics (GET -> GET)
    return NextResponse.redirect(dest, 307)
  } catch (err) {
    console.error('Redirect /profile/designs failed', err)
    return NextResponse.redirect('/profile#designs')
  }
}
