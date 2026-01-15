import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/forum - Get forum categories and recent posts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get all categories
    const categories = await prisma.forumCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { posts: true } },
      },
    });

    // Get posts
    let postsWhere: Record<string, unknown> = {};
    if (categorySlug) {
      const category = categories.find(c => c.slug === categorySlug);
      if (category) {
        postsWhere.categoryId = category.id;
      }
    }

    const [posts, totalPosts] = await Promise.all([
      prisma.forumPost.findMany({
        where: postsWhere,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayName: true,
              image: true,
              isVerified: true,
              verificationBadge: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.forumPost.count({ where: postsWhere }),
    ]);

    return NextResponse.json({
      categories,
      posts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        pages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    console.error("Get forum error:", error);
    return NextResponse.json(
      { error: "Failed to get forum data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forum - Create a new post
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, categoryId } = body;

    if (!title || !content || !categoryId) {
      return NextResponse.json(
        { error: "Title, content, and category are required" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
      '-' + Date.now().toString(36);

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        slug,
        categoryId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
