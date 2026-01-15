import { Metadata } from 'next'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.com'
const SITE_NAME = 'Fashion Marketplace'

interface DesignMetadata {
  id: string
  title: string
  description?: string
  category: string
  price: number
  imageUrl: string
  designerName?: string
  tags?: string[]
}

interface DesignerMetadata {
  id: string
  name: string
  bio?: string
  image?: string
  specialties?: string[]
  totalDesigns: number
  avgRating: number
}

/**
 * Generate SEO metadata for a design page
 */
export function generateDesignMetadata(design: DesignMetadata): Metadata {
  const title = `${design.title} | ${design.category} Design - ${SITE_NAME}`
  const description = design.description 
    || `Discover "${design.title}" - a stunning ${design.category.toLowerCase()} design. Price: $${design.price.toFixed(2)}. ${design.designerName ? `By ${design.designerName}.` : ''}`
  
  const keywords = [
    design.category,
    'fashion design',
    'fashion illustration',
    ...(design.tags || []),
    'buy fashion design',
    'digital fashion'
  ].join(', ')

  return {
    title,
    description,
    keywords,
    openGraph: {
      type: 'website',
      title: design.title,
      description,
      url: `${BASE_URL}/designs/${design.id}`,
      siteName: SITE_NAME,
      images: [
        {
          url: design.imageUrl,
          width: 1200,
          height: 630,
          alt: design.title,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: design.title,
      description,
      images: [design.imageUrl],
    },
    alternates: {
      canonical: `${BASE_URL}/designs/${design.id}`,
    },
    other: {
      'product:price:amount': design.price.toString(),
      'product:price:currency': 'USD',
    }
  }
}

/**
 * Generate SEO metadata for a designer profile page
 */
export function generateDesignerMetadata(designer: DesignerMetadata): Metadata {
  const title = `${designer.name} | Fashion Designer - ${SITE_NAME}`
  const description = designer.bio 
    || `Explore designs by ${designer.name}. ${designer.totalDesigns} designs available. ${designer.avgRating > 0 ? `${designer.avgRating.toFixed(1)}★ rating.` : ''} ${designer.specialties?.length ? `Specializes in: ${designer.specialties.join(', ')}.` : ''}`

  return {
    title,
    description,
    openGraph: {
      type: 'profile',
      title: designer.name,
      description,
      url: `${BASE_URL}/designers/${designer.id}`,
      siteName: SITE_NAME,
      images: designer.image ? [
        {
          url: designer.image,
          width: 400,
          height: 400,
          alt: designer.name,
        }
      ] : undefined,
    },
    twitter: {
      card: 'summary',
      title: designer.name,
      description,
      images: designer.image ? [designer.image] : undefined,
    },
    alternates: {
      canonical: `${BASE_URL}/designers/${designer.id}`,
    },
  }
}

/**
 * Generate SEO metadata for category pages
 */
export function generateCategoryMetadata(category: string, count: number): Metadata {
  const title = `${category} Fashion Designs | Browse ${count}+ Designs - ${SITE_NAME}`
  const description = `Discover ${count}+ ${category.toLowerCase()} fashion designs from talented designers worldwide. Find the perfect design for your next collection.`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${BASE_URL}/categories/${encodeURIComponent(category.toLowerCase())}`,
      siteName: SITE_NAME,
    },
    alternates: {
      canonical: `${BASE_URL}/categories/${encodeURIComponent(category.toLowerCase())}`,
    },
  }
}

/**
 * Generate JSON-LD structured data for a design (Product schema)
 */
export function generateDesignJsonLd(design: DesignMetadata & { 
  designerId: string
  avgRating?: number 
  reviewCount?: number 
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: design.title,
    description: design.description,
    image: design.imageUrl,
    url: `${BASE_URL}/designs/${design.id}`,
    brand: {
      '@type': 'Brand',
      name: design.designerName || 'Independent Designer',
    },
    offers: {
      '@type': 'Offer',
      price: design.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/designs/${design.id}`,
    },
    ...(design.avgRating && design.reviewCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: design.avgRating,
        reviewCount: design.reviewCount,
      },
    }),
    category: design.category,
  }
}

/**
 * Generate JSON-LD structured data for a designer (Person schema)
 */
export function generateDesignerJsonLd(designer: DesignerMetadata) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: designer.name,
    description: designer.bio,
    image: designer.image,
    url: `${BASE_URL}/designers/${designer.id}`,
    jobTitle: 'Fashion Designer',
    knowsAbout: designer.specialties,
  }
}

/**
 * Generate JSON-LD for the website (Organization schema)
 */
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'A marketplace for fashion designers to showcase and sell their illustrations, sketches, and designs.',
    sameAs: [
      'https://twitter.com/fashionmarketplace',
      'https://instagram.com/fashionmarketplace',
      'https://facebook.com/fashionmarketplace',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@fashionmarketplace.com',
    },
  }
}

/**
 * Generate breadcrumb JSON-LD
 */
export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  }
}
