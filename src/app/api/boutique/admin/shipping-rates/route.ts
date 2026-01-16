// POST /api/boutique/admin/shipping-rates - Create shipping zone
// GET /api/boutique/admin/shipping-rates - List all shipping zones
// PATCH /api/boutique/admin/shipping-rates - Update shipping zone
// DELETE /api/boutique/admin/shipping-rates - Deactivate shipping zone

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Verify admin access
async function verifyAdmin(session: { user?: { id?: string; role?: string } } | null) {
  if (!session?.user?.id) return false;
  if (session.user.role === 'ADMIN') return true;
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === 'ADMIN';
}

// GET - List all shipping zones
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = await verifyAdmin(session);
    
    // Allow both admins and regular users to see active rates
    const where = isAdmin 
      ? {} // Admins see all
      : { isActive: true }; // Regular users only see active

    const zones = await prisma.shippingZone.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      zones,
    });
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shipping zones' },
      { status: 500 }
    );
  }
}

// POST - Create new shipping zone (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!await verifyAdmin(session)) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      countries = [],
      states = [],
      baseRate,
      perKgRate = 0,
      freeShippingThreshold,
      minDays,
      maxDays,
    } = body;

    // Validate required fields
    if (!name || baseRate === undefined || minDays === undefined || maxDays === undefined) {
      return NextResponse.json(
        { success: false, message: 'Name, baseRate, minDays, and maxDays are required' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (baseRate < 0 || perKgRate < 0 || minDays < 0 || maxDays < minDays) {
      return NextResponse.json(
        { success: false, message: 'Invalid rate or delivery day values' },
        { status: 400 }
      );
    }

    // Check for duplicate zone name
    const existingZone = await prisma.shippingZone.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingZone) {
      return NextResponse.json(
        { success: false, message: 'A shipping zone with this name already exists' },
        { status: 400 }
      );
    }

    const zone = await prisma.shippingZone.create({
      data: {
        name,
        countries,
        states,
        baseRate,
        perKgRate,
        freeShippingThreshold: freeShippingThreshold || null,
        minDays,
        maxDays,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shipping zone created successfully',
      zone,
    });
  } catch (error) {
    console.error('Error creating shipping zone:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create shipping zone' },
      { status: 500 }
    );
  }
}

// PATCH - Update shipping zone (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!await verifyAdmin(session)) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Zone ID is required' },
        { status: 400 }
      );
    }

    // Check zone exists
    const existingZone = await prisma.shippingZone.findUnique({
      where: { id },
    });

    if (!existingZone) {
      return NextResponse.json(
        { success: false, message: 'Shipping zone not found' },
        { status: 404 }
      );
    }

    // If name is being changed, check for duplicates
    if (updateData.name && updateData.name !== existingZone.name) {
      const duplicateName = await prisma.shippingZone.findFirst({
        where: { 
          name: { equals: updateData.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          { success: false, message: 'A shipping zone with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Validate numeric fields if provided
    if (updateData.baseRate !== undefined && updateData.baseRate < 0) {
      return NextResponse.json(
        { success: false, message: 'Base rate cannot be negative' },
        { status: 400 }
      );
    }

    if (updateData.perKgRate !== undefined && updateData.perKgRate < 0) {
      return NextResponse.json(
        { success: false, message: 'Per kg rate cannot be negative' },
        { status: 400 }
      );
    }

    const minDays = updateData.minDays ?? existingZone.minDays;
    const maxDays = updateData.maxDays ?? existingZone.maxDays;
    if (maxDays < minDays) {
      return NextResponse.json(
        { success: false, message: 'Max days cannot be less than min days' },
        { status: 400 }
      );
    }

    const zone = await prisma.shippingZone.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Shipping zone updated successfully',
      zone,
    });
  } catch (error) {
    console.error('Error updating shipping zone:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update shipping zone' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate shipping zone (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!await verifyAdmin(session)) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Zone ID is required' },
        { status: 400 }
      );
    }

    // Soft delete - just deactivate
    const zone = await prisma.shippingZone.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Shipping zone deactivated',
      zone,
    });
  } catch (error) {
    console.error('Error deactivating shipping zone:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to deactivate shipping zone' },
      { status: 500 }
    );
  }
}
