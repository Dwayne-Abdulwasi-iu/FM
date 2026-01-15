import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET - Get notifications for the current user with cursor-based pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const cursor = searchParams.get("cursor"); // ID of the last notification from previous page
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.user.id, isDeleted: false };
    if (unreadOnly) {
      where.isRead = false;
    }
    
    // Cursor-based pagination query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryOptions: any = {
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to determine if there are more
    };
    
    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1; // Skip the cursor item itself
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [notificationsRaw, unreadCount, totalCount] = await Promise.all([
      (prisma as any).notification.findMany(queryOptions),
      (prisma as any).notification.count({
        where: { userId: session.user.id, isRead: false, isDeleted: false },
      }),
      (prisma as any).notification.count({
        where: { userId: session.user.id, isDeleted: false },
      }),
    ]);
    
    // Determine if there's a next page
    const hasMore = notificationsRaw.length > limit;
    const notifications = hasMore ? notificationsRaw.slice(0, limit) : notificationsRaw;
    const nextCursor = hasMore ? notifications[notifications.length - 1]?.id : null;
    
    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount,
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { notificationId, markAllRead } = body;
    
    if (markAllRead) {
      // Mark all non-deleted notifications as read for this user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).notification.updateMany({
        where: { userId: session.user.id, isRead: false, isDeleted: false },
        data: { isRead: true, readAt: new Date() },
      });
      
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }
    
    if (!notificationId) {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 });
    }
    
    // Verify notification belongs to this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notification = await (prisma as any).notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete a notification (maintains audit trail)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    
    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }
    
    // Verify notification belongs to this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notification = await (prisma as any).notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Soft delete - maintain audit trail for security purposes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).notification.update({
      where: { id: notificationId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
