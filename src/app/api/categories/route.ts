import { NextRequest, NextResponse } from 'next/server'

// Minimal categories handler to satisfy Next.js route typing and provide a
// safe default response during type-check / dev runs.
export async function GET(request: NextRequest) {
	return NextResponse.json({ categories: [] })
}
