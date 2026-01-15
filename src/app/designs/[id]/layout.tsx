import { Metadata } from 'next'
import prisma from '@/lib/prisma'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  try {
    const design = await prisma.design.findUnique({
      where: { id, isActive: true, approvalStatus: 'APPROVED' },
      select: {
        title: true,
        description: true,
        price: true,
        imageUrl: true,
        thumbnailUrl: true,
        category: true,
        tags: true,
        totalSales: true,
        designer: {
          select: {
            name: true,
            displayName: true,
          }
        },
        _count: {
          select: { reviews: true }
        }
      }
    })

    if (!design) {
      return {
        title: 'Design Not Found | Fashion Marketplace',
        description: 'The requested design could not be found.',
      }
    }

    const designerName = design.designer?.displayName || design.designer?.name || 'Designer'
    const title = `${design.title} by ${designerName} | Fashion Marketplace`
    const description = design.description 
      ? design.description.substring(0, 160) 
      : `${design.title} - A unique fashion design by ${designerName}. Price: $${design.price}. ${design.totalSales} sold.`
    
    const imageUrl = design.thumbnailUrl || design.imageUrl
    const tags = Array.isArray(design.tags) ? design.tags : []

    return {
      title,
      description,
      keywords: [
        design.category,
        'fashion design',
        'pattern',
        designerName,
        ...tags,
        'african fashion',
        'ankara patterns',
      ].filter(Boolean),
      authors: [{ name: designerName }],
      openGraph: {
        title: design.title,
        description,
        type: 'website',
        images: imageUrl ? [
          {
            url: imageUrl,
            width: 800,
            height: 800,
            alt: design.title,
          }
        ] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: design.title,
        description,
        images: imageUrl ? [imageUrl] : undefined,
      },
      other: {
        'product:price:amount': design.price.toString(),
        'product:price:currency': 'USD',
        'product:availability': 'in stock',
        'product:condition': 'new',
        'product:category': design.category,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Fashion Design | Fashion Marketplace',
      description: 'Discover unique fashion designs from talented designers.',
    }
  }
}

export default function DesignLayout({ children }: LayoutProps) {
  return <>{children}</>
}
