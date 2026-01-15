import { Metadata } from 'next'
import prisma from '@/lib/prisma'
import { CollectionPageJsonLd } from '@/components/seo/JsonLd'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingCart, TrendingUp } from 'lucide-react'

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic'

// Category SEO data
const CATEGORY_SEO: Record<string, { 
  title: string; 
  description: string; 
  keywords: string[];
  h1: string;
  intro: string;
}> = {
  'fashion-illustrations': {
    title: 'Fashion Illustrations | African & Modern Fashion Art',
    description: 'Discover stunning fashion illustrations from talented African designers. Hand-drawn croquis, digital fashion sketches, and artistic fashion artwork. Buy unique fashion illustrations today.',
    keywords: ['fashion illustration', 'african fashion art', 'croquis', 'fashion sketches', 'fashion artwork'],
    h1: 'Fashion Illustrations',
    intro: 'Explore beautiful hand-drawn and digital fashion illustrations from talented designers worldwide. Perfect for inspiration, reference, or direct use in your fashion projects.',
  },
  'pattern-designs': {
    title: 'Pattern Designs | Ankara Patterns & African Textiles',
    description: 'Browse unique pattern designs including Ankara patterns, African textile prints, and modern fabric designs. Download digital patterns for your fashion projects.',
    keywords: ['ankara patterns', 'african patterns', 'textile design', 'fabric patterns', 'pattern design'],
    h1: 'Pattern Designs',
    intro: 'Discover stunning pattern designs from African and international designers. From traditional Ankara prints to modern geometric patterns, find the perfect design for your next project.',
  },
  'digital-designs': {
    title: 'Digital Fashion Designs | CAD Patterns & Tech Packs',
    description: 'Professional digital fashion designs, CAD patterns, and tech packs. Computer-generated fashion artwork and ready-to-use digital design files.',
    keywords: ['digital fashion design', 'CAD patterns', 'tech packs', 'digital artwork', 'fashion CAD'],
    h1: 'Digital Designs',
    intro: 'Browse professional digital fashion designs created using industry-standard software. From CAD patterns to tech packs, find everything you need for your fashion production.',
  },
  'sketches': {
    title: 'Fashion Sketches | Quick Concept Drawings & Ideas',
    description: 'Explore creative fashion sketches and concept drawings. Quick sketches, design development work, and inspiration for your fashion projects.',
    keywords: ['fashion sketches', 'concept drawings', 'fashion ideas', 'quick sketches', 'design concepts'],
    h1: 'Fashion Sketches',
    intro: 'Browse through creative fashion sketches from emerging and established designers. Get inspired by concept drawings and design development work.',
  },
  'technical-drawings': {
    title: 'Technical Fashion Drawings | Flat Drawings & Spec Sheets',
    description: 'Professional technical fashion drawings, flat drawings, and spec sheets. Industry-standard technical illustrations for fashion production.',
    keywords: ['technical drawings', 'flat drawings', 'spec sheets', 'fashion flats', 'technical fashion'],
    h1: 'Technical Drawings',
    intro: 'Find professional technical fashion drawings ready for production. Detailed flat drawings, spec sheets, and technical illustrations from experienced designers.',
  },
  'embroidery-designs': {
    title: 'Embroidery Designs | African Embroidery Patterns & Motifs',
    description: 'Beautiful embroidery designs and digitized patterns. Traditional African embroidery motifs and modern decorative designs for fashion.',
    keywords: ['embroidery designs', 'african embroidery', 'embroidery patterns', 'decorative motifs', 'digitized embroidery'],
    h1: 'Embroidery Designs',
    intro: 'Discover exquisite embroidery designs from talented artists. From traditional African motifs to contemporary patterns, find the perfect embroidery for your garments.',
  },
  'print-designs': {
    title: 'Print Designs | Textile Prints & Fabric Patterns',
    description: 'Unique print designs for textiles and fabrics. African-inspired prints, modern patterns, and surface designs ready for production.',
    keywords: ['print designs', 'textile prints', 'fabric patterns', 'african prints', 'surface design'],
    h1: 'Print Designs',
    intro: 'Explore unique print designs for your fabric and textile projects. From bold African prints to subtle modern patterns, find designs that tell a story.',
  },
  'color-palettes': {
    title: 'Fashion Color Palettes | Seasonal Colors & Trends',
    description: 'Curated fashion color palettes and color schemes. Seasonal color trends, color forecasts, and harmonious palettes for fashion design.',
    keywords: ['color palettes', 'fashion colors', 'color trends', 'seasonal colors', 'color schemes'],
    h1: 'Color Palettes',
    intro: 'Discover carefully curated color palettes for your fashion collections. Stay on-trend with seasonal color forecasts and timeless color schemes.',
  },
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const seo = CATEGORY_SEO[slug]
  
  if (!seo) {
    return {
      title: 'Category Not Found | Fashion Marketplace',
      description: 'The requested category could not be found.',
    }
  }

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
  }
}

// Convert slug to category name
function slugToCategory(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const seo = CATEGORY_SEO[slug]
  const categoryName = slugToCategory(slug)
  
  if (!seo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <Link href="/categories" className="text-indigo-600 hover:text-indigo-800">
            Browse All Categories
          </Link>
        </div>
      </div>
    )
  }

  // Fetch designs for this category (SSR for SEO)
  const designs = await prisma.design.findMany({
    where: {
      category: categoryName,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
    take: 24,
    orderBy: [
      { totalSales: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      price: true,
      imageUrl: true,
      thumbnailUrl: true,
      totalSales: true,
      designer: {
        select: {
          name: true,
          displayName: true,
          isVerified: true,
        }
      },
      _count: {
        select: { reviews: true }
      }
    },
  })

  const totalDesigns = await prisma.design.count({
    where: {
      category: categoryName,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.com'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD for SEO */}
      <CollectionPageJsonLd
        name={seo.h1}
        description={seo.description}
        url={`${baseUrl}/categories/${slug}`}
        numberOfItems={totalDesigns}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/categories" className="text-gray-500 hover:text-gray-700">Categories</Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">{seo.h1}</li>
          </ol>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{seo.h1}</h1>
          <p className="text-lg text-gray-600 max-w-3xl">{seo.intro}</p>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {totalDesigns} designs available
            </span>
          </div>
        </div>

        {/* Designs Grid */}
        {designs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {designs.map((design) => (
              <Link
                key={design.id}
                href={`/designs/${design.id}`}
                className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="aspect-square relative overflow-hidden bg-gray-100">
                  <Image
                    src={design.thumbnailUrl || design.imageUrl}
                    alt={design.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  {design.totalSales > 0 && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {design.totalSales} sold
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-1 group-hover:text-indigo-600">
                    {design.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    by {design.designer?.displayName || design.designer?.name || 'Designer'}
                    {design.designer?.isVerified && ' ✓'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-gray-900">${design.price}</span>
                    {design._count && design._count.reviews > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-gray-400">({design._count.reviews})</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No designs yet</h2>
            <p className="text-gray-500 mb-6">Be the first to upload a design in this category!</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Upload Your Design
            </Link>
          </div>
        )}

        {/* View All Link */}
        {designs.length >= 24 && (
          <div className="mt-8 text-center">
            <Link
              href={`/search?category=${encodeURIComponent(categoryName)}`}
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All {totalDesigns} Designs
            </Link>
          </div>
        )}

        {/* SEO Content Section */}
        <section className="mt-16 prose prose-gray max-w-none">
          <h2>About {seo.h1}</h2>
          <p>
            Fashion Marketplace offers a curated collection of {seo.h1.toLowerCase()} from talented designers 
            around the world. Whether you&apos;re a fashion student, professional designer, or fashion enthusiast, 
            you&apos;ll find unique and inspiring designs to fuel your creativity.
          </p>
          <p>
            Our {seo.h1.toLowerCase()} collection features work from verified designers who bring years of 
            experience in African and international fashion. Each design is carefully reviewed to ensure 
            quality and originality.
          </p>
          <h3>Why Choose Our {seo.h1}?</h3>
          <ul>
            <li>Verified designers with proven track records</li>
            <li>Instant digital downloads after purchase</li>
            <li>Secure payment via Stripe and Paystack</li>
            <li>Custom commissions available from many designers</li>
            <li>Dedicated customer support</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
