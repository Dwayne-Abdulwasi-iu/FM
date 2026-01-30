/**
 * FLAW FIX #16: Cloudinary Cleanup with Retry Logic
 * Ensures preview files are properly deleted with exponential backoff
 */

import { v2 as cloudinary } from 'cloudinary'

export interface CloudinaryDeleteLog {
  fileUrl: string
  attempts: number
  lastError?: string
  markedForManualReview: boolean
  lastAttemptAt?: Date
}

/**
 * Delete from Cloudinary with retry logic
 * Uses exponential backoff to handle transient failures
 */
export async function deleteFromCloudinaryWithRetry(
  fileUrl: string,
  maxRetries: number = 3
): Promise<{
  success: boolean
  attempts: number
  error?: string
}> {
  let attempts = 0
  let lastError: string | undefined

  while (attempts < maxRetries) {
    try {
      attempts++
      
      // Extract public ID from Cloudinary URL
      // Format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}
      const publicIdMatch = fileUrl.match(/\/v\d+\/(.+?)(?:\.\w+)?(?:\?|$)/)
      if (!publicIdMatch) {
        throw new Error(`Invalid Cloudinary URL format: ${fileUrl}`)
      }

      const publicId = publicIdMatch[1]

      // Determine resource type (video or image)
      const isVideo = fileUrl.includes('/video/upload/')
      const resourceType = isVideo ? 'video' : 'image'

      // Attempt deletion
      const result = await cloudinary.api.delete_resources([publicId], {
        resource_type: resourceType,
        type: 'upload'
      })

      // Success
      return {
        success: true,
        attempts,
        error: undefined
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)

      // Only retry on transient errors (network, timeout)
      const isTransient = 
        lastError.includes('timeout') ||
        lastError.includes('ECONNREFUSED') ||
        lastError.includes('ENOTFOUND') ||
        lastError.includes('503') ||
        lastError.includes('429') // Rate limit

      if (!isTransient || attempts >= maxRetries) {
        // Don't retry on permanent errors or max retries reached
        break
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = 1000 * Math.pow(2, attempts - 1)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
    }
  }

  return {
    success: false,
    attempts,
    error: lastError
  }
}

/**
 * FLAW FIX #16: Log failed Cloudinary deletions for manual review
 */
export async function logCloudinaryDeleteFailure(
  prisma: any,
  documentId: string,
  fileUrl: string,
  error: string
): Promise<void> {
  try {
    // Create or update delete log
    await prisma.cloudinaryDeleteLog.upsert({
      where: { fileUrl },
      create: {
        documentId,
        fileUrl,
        status: 'FAILED',
        attempts: 3,
        lastError: error,
        markedForManualReview: true,
        lastAttemptAt: new Date()
      },
      update: {
        status: 'FAILED',
        attempts: { increment: 1 },
        lastError: error,
        lastAttemptAt: new Date(),
        markedForManualReview: true
      }
    })

    // Notify admin (optional - implement your notification system)
    console.warn(
      `⚠️  Cloudinary cleanup failed for document ${documentId}: ${error}`
    )
  } catch (err) {
    console.error('Failed to log Cloudinary delete failure:', err)
  }
}

/**
 * FLAW FIX #16: Admin script to find and retry orphaned files
 */
export async function findOrphanedCloudinaryFiles(prisma: any) {
  const failedDeletions = await prisma.cloudinaryDeleteLog.findMany({
    where: {
      status: 'FAILED',
      markedForManualReview: true
    },
    orderBy: {
      lastAttemptAt: 'asc'
    },
    take: 10 // Process top 10
  })

  console.log(`Found ${failedDeletions.length} failed deletions to retry\n`)

  for (const deletion of failedDeletions) {
    console.log(`Retrying: ${deletion.fileUrl}`)
    const result = await deleteFromCloudinaryWithRetry(deletion.fileUrl, 3)

    if (result.success) {
      // Mark as successfully deleted
      await prisma.cloudinaryDeleteLog.update({
        where: { fileUrl: deletion.fileUrl },
        data: {
          status: 'SUCCESS',
          deletedAt: new Date(),
          markedForManualReview: false
        }
      })
      console.log(`  ✅ Success (${result.attempts} attempts)`)
    } else {
      console.log(`  ❌ Still failing: ${result.error}`)
      // Keep marked for manual review
    }
  }
}
