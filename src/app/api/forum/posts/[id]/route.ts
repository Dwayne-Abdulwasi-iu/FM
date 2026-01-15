import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/forum/posts/[id] - Get a specific post with comments
 * Supports both ID and slug lookup
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // First, try to find the post by ID or slug
    const existingPost = await prisma.forumPost.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      select: { id: true },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Now update view count and get full post
    const post = await prisma.forumPost.update({
      where: { id: existingPost.id },
      data: { viewCount: { increment: 1 } },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
            bio: true,
            isVerified: true,
            verificationBadge: true,
            createdAt: true,
          },
        },
        category: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                displayName: true,
                image: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json(
      { error: "Failed to get post" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/forum/posts/[id] - Update a post
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, isPinned, isLocked } = body;

    // Get the post
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check authorization
    const isAuthor = post.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    
    // Only admins can pin/lock posts
    if (isAdmin) {
      if (typeof isPinned === 'boolean') updateData.isPinned = isPinned;
      if (typeof isLocked === 'boolean') updateData.isLocked = isLocked;
    }

    const updatedPost = await prisma.forumPost.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
          },
        },
        category: true,
      },
    });

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forum/posts/[id] - Delete a post
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the post
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check authorization
    const isAuthor = post.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all comments first
    await prisma.forumComment.deleteMany({ where: { postId: id } });

    // Delete the post
    await prisma.forumPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
