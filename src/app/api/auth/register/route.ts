import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()
    // SECURITY: Role is always USER - never accept from client to prevent privilege escalation
    const role = "USER";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    // Prisma error P2031 occurs when MongoDB transactions are attempted but
    // the server is not a replica set (common for local single-node mongod).
    // Provide a clearer message so devs can fix their local Mongo setup.
    // See: https://pris.ly/d/mongodb-replica-set
    // If other errors occur, fall back to generic 500.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e: any = error
    if (e && e.code === 'P2031') {
      return NextResponse.json(
        {
          error:
            'Prisma requires MongoDB to be run as a replica set for transactions (P2031). For local dev: start mongod with --replSet and run rs.initiate(), or use MongoDB Atlas.'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}