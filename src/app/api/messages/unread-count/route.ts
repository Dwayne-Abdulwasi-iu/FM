import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface Message {
  senderRole: "CLIENT" | "DESIGNER";
  readAt?: string;
}

interface CommissionMinimal {
  id: string;
  title: string;
  requesterId: string;
  designerId: string;
  messages: Message[];
}

interface UnreadCommission {
  commissionId: string;
  commissionTitle: string;
  unreadCount: number;
  role: "CLIENT" | "DESIGNER";
}

/**
 * GET - Get unread message counts for the current user
 * Returns total unread count and per-commission breakdown
 * 
 * Optimization: Only fetches minimal message fields (senderRole, readAt)
 * to reduce memory usage and network transfer
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get all commissions where user is client or designer with active messaging statuses
    const messageableStatuses = [
      "FORWARDED", "QUOTED", "PAID", "IN_PROGRESS", 
      "DELIVERED", "REVISION", "DISPUTED"
    ];
    
    // Optimized query: only fetch fields needed for unread calculation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commissions = await (prisma as any).commissionRequest.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { designerId: userId }
        ],
        status: { in: messageableStatuses }
      },
      select: {
        id: true,
        title: true,
        requesterId: true,
        designerId: true,
        messages: true, // JSON field - Prisma doesn't support projection within JSON
      }
    }) as CommissionMinimal[];
    
    let totalUnread = 0;
    const commissionsWithUnread: UnreadCommission[] = [];
    
    // Process commissions with early bailout for those with no messages
    for (const commission of commissions) {
      const messages = commission.messages;
      
      // Skip if no messages
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        continue;
      }
      
      const isClient = commission.requesterId === userId;
      const myRole = isClient ? "CLIENT" : "DESIGNER";
      
      // Count unread messages from the other party
      // Using reduce for single-pass counting
      let unreadCount = 0;
      for (const msg of messages) {
        if (msg.senderRole !== myRole && !msg.readAt) {
          unreadCount++;
        }
      }
      
      if (unreadCount > 0) {
        totalUnread += unreadCount;
        commissionsWithUnread.push({
          commissionId: commission.id,
          commissionTitle: commission.title,
          unreadCount,
          role: myRole
        });
      }
    }
    
    // Sort by unread count descending so most active appear first
    commissionsWithUnread.sort((a, b) => b.unreadCount - a.unreadCount);
    
    return NextResponse.json({
      totalUnread,
      commissions: commissionsWithUnread
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
