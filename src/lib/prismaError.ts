import { NextResponse } from 'next/server'
import { PrismaClientKnownRequestError, PrismaClientInitializationError } from '@prisma/client/runtime/library'

/**
 * Handle Prisma errors and return appropriate HTTP responses
 * Returns a NextResponse for transient/connection errors, or null if error should be handled differently
 */
export function prismaErrorResponse(error: unknown, fallbackMessage = 'Database temporarily unavailable'): NextResponse | null {
  // Handle Prisma connection/initialization errors
  if (error instanceof PrismaClientInitializationError) {
    console.error('Prisma initialization error:', error.message)
    return NextResponse.json(
      { error: fallbackMessage },
      { status: 503 }
    )
  }

  // Handle Prisma known request errors
  if (error instanceof PrismaClientKnownRequestError) {
    // Connection errors
    if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1003') {
      console.error('Prisma connection error:', error.message)
      return NextResponse.json(
        { error: fallbackMessage },
        { status: 503 }
      )
    }
    
    // Unique constraint violation
    if (error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined
      const field = target?.[0] || 'field'
      return NextResponse.json(
        { error: `A record with this ${field} already exists` },
        { status: 409 }
      )
    }

    // Record not found (for update/delete operations)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }
  }

  // Check for generic connection errors
  if (error instanceof Error) {
    if (
      error.message.includes('Connection') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('timeout') ||
      error.message.includes('MongoNetworkError')
    ) {
      console.error('Database connection error:', error.message)
      return NextResponse.json(
        { error: fallbackMessage },
        { status: 503 }
      )
    }
  }

  // Return null to indicate error should be handled by caller
  return null
}
