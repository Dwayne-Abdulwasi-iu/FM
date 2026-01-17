import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        isVerified: true,
        verificationStatus: true,
        designerTier: true,
        totalSales: true,
        totalEarnings: true,
        avgRating: true,
        trustScore: true,
        bio: true,
        location: true,
        website: true,
        createdAt: true,
        acceptsCommissions: true,
        commissionStatus: true,
        sellerAccount: {
          select: {
            bankName: true,
            accountName: true,
            accountNumber: true,
            subaccountCode: true,
            createdAt: true,
          }
        },
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get design orders (where user is the designer/seller)
    const designOrders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            design: {
              designerId: id
            }
          }
        }
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        orderType: true,
        paymentMethod: true,
        createdAt: true,
        paidAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        items: {
          select: {
            id: true,
            price: true,
            purchaseType: true,
            design: {
              select: {
                id: true,
                title: true,
                designerId: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Filter items to only include designs from this seller
    const filteredDesignOrders = designOrders.map(order => ({
      ...order,
      items: order.items.filter(item => item.design?.designerId === id),
    })).filter(order => order.items.length > 0)

    // Get POD orders (where user is the designer/seller and orderType is POD)
    const podOrders = await prisma.order.findMany({
      where: {
        orderType: 'POD',
        items: {
          some: {
            design: {
              designerId: id
            }
          }
        }
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        podProvider: true,
        podStatus: true,
        trackingNumber: true,
        shippingName: true,
        shippingCity: true,
        shippingCountry: true,
        createdAt: true,
        paidAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        items: {
          select: {
            id: true,
            price: true,
            podProductName: true,
            design: {
              select: {
                id: true,
                title: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get boutique orders (where user is the seller)
    const boutiqueOrders = await prisma.boutiqueOrder.findMany({
      where: {
        sellerId: id
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        currency: true,
        fulfillmentMethod: true,
        paymentMethod: true,
        trackingNumber: true,
        createdAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        product: {
          select: {
            id: true,
            title: true,
          }
        },
        items: {
          select: {
            id: true,
            price: true,
            quantity: true,
            variantSnapshot: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get commission requests (where user is the designer)
    const commissions = await prisma.commissionRequest.findMany({
      where: {
        designerId: id
      },
      select: {
        id: true,
        status: true,
        isPaid: true,
        designerQuote: true,
        title: true,
        description: true,
        createdAt: true,
        completedAt: true,
        requesterId: true,
        requesterName: true,
        requesterEmail: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get user's designs (for reference)
    const designs = await prisma.design.findMany({
      where: { designerId: id },
      select: {
        id: true,
        title: true,
        price: true,
        approvalStatus: true,
        createdAt: true,
        _count: {
          select: {
            orderItems: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Get user's boutique products
    const boutiqueProducts = await prisma.boutiqueProduct.findMany({
      where: { sellerId: id },
      select: {
        id: true,
        title: true,
        basePrice: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Count statistics
    const stats = {
      totalDesigns: designs.length,
      totalBoutiqueProducts: boutiqueProducts.length,
      totalDesignOrders: filteredDesignOrders.length,
      totalPodOrders: podOrders.length,
      totalBoutiqueOrders: boutiqueOrders.length,
      totalCommissions: commissions.length,
    }

    return NextResponse.json({
      user,
      stats,
      orders: {
        designs: filteredDesignOrders,
        pod: podOrders,
        boutique: boutiqueOrders,
        commissions,
      },
      products: {
        designs,
        boutique: boutiqueProducts,
      }
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
