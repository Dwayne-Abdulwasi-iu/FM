import { NextResponse } from 'next/server'

export function prismaErrorResponse(error: unknown, fallbackMessage = 'Database temporarily unavailable, please try again later.') {
  const e = error as { code?: string; name?: string; message?: string; [k: string]: unknown }

  // Common Prisma transient / connector errors: map to 503 Service Unavailable so callers
  // can treat them as transient and retry or show proper UX.
  const looksLikeTransient =
    // Prisma known transient error code
    e?.code === 'P2010' ||
    // Prisma-known request error wrapper
    e?.name === 'PrismaClientKnownRequestError' ||
    // Initialization / connector failures (driver-level)
    e?.name === 'PrismaClientInitializationError' ||
    e?.name === 'ConnectorError' ||
    // Catch specific phrases we observed in logs (SCRAM / auth failures / connection pool cleared)
    (typeof e?.message === 'string' && /SCRAM|Authentication failed|connection pool/i.test(e.message))

  if (looksLikeTransient) {
    return NextResponse.json({ message: fallbackMessage }, { status: 503 })
  }

  return null
}
