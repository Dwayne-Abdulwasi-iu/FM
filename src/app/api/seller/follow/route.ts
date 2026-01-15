import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/seller/follow
 * Get follow stats and following status for a designer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const searchParams = request.nextUrl.searchParams
    const designerId = searchParams.get('designerId')

    if (!designerId) {
      return NextResponse.json(
        { message: 'Designer ID is required' },
        { status: 400 }
      )
    }

    // Get follower count
    const followerCount = await prisma.follow.count({
      where: { followingId: designerId }
    })

    // Check if current user is following
    let isFollowing = false
    if (session?.user?.id) {
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: designerId
          }
        }
      })
      isFollowing = !!existingFollow
    }

    return NextResponse.json({
      followerCount,
      isFollowing
    })

  } catch (error) {
    console.error('Get follow status error:', error)
    return NextResponse.json(
      { message: 'Failed to get follow status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/seller/follow
 * Follow a designer
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { designerId } = body

    if (!designerId) {
      return NextResponse.json(
        { message: 'Designer ID is required' },
        { status: 400 }
      )
    }

    // Can't follow yourself
    if (designerId === session.user.id) {
      return NextResponse.json(
        { message: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if designer exists
    const designer = await prisma.user.findUnique({
      where: { id: designerId },
      select: { id: true }
    })

    if (!designer) {
      return NextResponse.json(
        { message: 'Designer not found' },
        { status: 404 }
      )
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: designerId
        }
      }
    })

    if (existingFollow) {
      return NextResponse.json(
        { message: 'Already following this designer' },
        { status: 400 }
      )
    }

    // Create follow
    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId: designerId
      }
    })

    // Get new follower count
    const followerCount = await prisma.follow.count({
      where: { followingId: designerId }
    })

    return NextResponse.json({
      message: 'Now following designer',
      isFollowing: true,
      followerCount
    })

  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { message: 'Failed to follow designer' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/seller/follow
 * Unfollow a designer
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const designerId = searchParams.get('designerId')

    if (!designerId) {
      return NextResponse.json(
        { message: 'Designer ID is required' },
        { status: 400 }
      )
    }

    // Delete follow if exists
    await prisma.follow.deleteMany({
      where: {
        followerId: session.user.id,
        followingId: designerId
      }
    })

    // Get new follower count
    const followerCount = await prisma.follow.count({
      where: { followingId: designerId }
    })

    return NextResponse.json({
      message: 'Unfollowed designer',
      isFollowing: false,
      followerCount
    })

  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { message: 'Failed to unfollow designer' },
      { status: 500 }
    )
  }
}
