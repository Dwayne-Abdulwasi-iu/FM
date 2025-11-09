import { NextResponse } from 'next/server'

export async function POST() {
  // Legacy link-based reset endpoint has been disabled in favor of the OTP flow.
  // Return 410 Gone to indicate the endpoint is no longer in use.
  return NextResponse.json({ message: 'This endpoint has been disabled. Use the OTP reset flow.' }, { status: 410 })
}
