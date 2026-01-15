import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { key: "homepage_stats" },
    });

    if (!settings) {
      // Return default values
      return NextResponse.json({
        stats: [
          { number: "10,000+", label: "Active Designers" },
          { number: "50,000+", label: "Designs Sold" },
          { number: "150+", label: "Countries" },
          { number: "$2M+", label: "Earned by Designers" },
        ],
      });
    }

    return NextResponse.json({
      stats: settings.value as typeof defaultStats,
    });
  } catch (error) {
    console.error("Error fetching stats settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats settings" },
      { status: 500 }
    );
  }
}

const _defaultStats = [
  { number: "10,000+", label: "Active Designers" },
  { number: "50,000+", label: "Designs Sold" },
  { number: "150+", label: "Countries" },
  { number: "$2M+", label: "Earned by Designers" },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { stats } = body;

    if (!stats || !Array.isArray(stats) || stats.length !== 4) {
      return NextResponse.json(
        { error: "Invalid stats format" },
        { status: 400 }
      );
    }

    const updated = await prisma.settings.upsert({
      where: { key: "homepage_stats" },
      update: { value: stats },
      create: {
        key: "homepage_stats",
        value: stats,
      },
    });

    return NextResponse.json({
      message: "Stats updated successfully",
      stats: updated.value,
    });
  } catch (error) {
    console.error("Error updating stats settings:", error);
    return NextResponse.json(
      { error: "Failed to update stats settings" },
      { status: 500 }
    );
  }
}
