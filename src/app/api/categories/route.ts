import { NextResponse } from 'next/server'

// Placeholder endpoint to prevent build/type errors when route is unused.
// Replace with real implementation when categories are stored in the database.
export async function GET() {
	return NextResponse.json({ categories: [] })
}

