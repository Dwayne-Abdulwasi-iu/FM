import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/forum/posts/[id]/comments - Add a comment to a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const body = await request.json();
    const { content, parentId } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Check if post exists and is not locked
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, isLocked: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.isLocked) {
      return NextResponse.json(
        { error: "This post is locked and cannot receive new comments" },
        { status: 403 }
      );
    }

    // If replying to a comment, verify parent exists
    if (parentId) {
      const parentComment = await prisma.forumComment.findUnique({
        where: { id: parentId },
        select: { postId: true },
      });

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.forumComment.create({
      data: {
        content,
        postId,
        authorId: session.user.id,
        parentId: parentId || null,
      },
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
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/forum/posts/[id]/comments - Get comments for a post
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const [comments, total] = await Promise.all([
      prisma.forumComment.findMany({
        where: { postId },
        skip: (page - 1) * limit,
        take: limit,
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
          replies: {
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
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.forumComment.count({ where: { postId } }),
    ]);

    // Filter to only top-level comments (no parent)
    const topLevelComments = comments.filter(c => !c.parentId);

    return NextResponse.json({
      comments: topLevelComments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "Failed to get comments" },
      { status: 500 }
    );
  }
}
