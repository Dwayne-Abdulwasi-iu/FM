import { NextResponse } from 'next/server'

export function prismaErrorResponse(error: unknown, fallbackMessage = 'Database temporarily unavailable, please try again later.') {
  const e = error as { code?: string; name?: string; [k: string]: unknown }
  if (e && (e.code === 'P2010' || e?.name === 'PrismaClientKnownRequestError')) {
    return NextResponse.json({ message: fallbackMessage }, { status: 503 })
  }
  return null
}
