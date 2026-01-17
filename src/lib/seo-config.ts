import { Metadata } from 'next'

const SITE_NAME = 'Fashion Marketplace'
const SITE_URL = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.com'
const DEFAULT_IMAGE = `${SITE_URL}/images/og-default.jpg`

export interface SEOConfig {
  title: string
  description: string
  keywords?: readonly string[] | string[]
  image?: string
  noIndex?: boolean
}

/**
 * Generate metadata for a page
 */
export function generateSEOMetadata(config: SEOConfig): Metadata {
  const title = config.title.includes(SITE_NAME) 
    ? config.title 
    : `${config.title} | ${SITE_NAME}`
    
  return {
    title,
    description: config.description,
    keywords: config.keywords?.join(', '),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description: config.description,
      images: [{ url: config.image || DEFAULT_IMAGE }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: config.description,
      images: [config.image || DEFAULT_IMAGE],
    },
    robots: config.noIndex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical: SITE_URL,
    },
  }
}

/**
 * Pre-defined SEO configs for common pages
 */
export const SEO_CONFIGS = {
  home: {
    title: 'Fashion Marketplace - Buy & Sell Fashion Designs',
    description: 'Discover unique fashion illustrations, sketches, and designs from talented designers worldwide. Start selling your creative work with just 0.1% commission on your first $100.',
    keywords: ['fashion designs', 'fashion illustrations', 'buy designs', 'sell designs', 'fashion marketplace', 'design marketplace']
  },
  designs: {
    title: 'Browse Fashion Designs',
    description: 'Explore thousands of unique fashion designs, illustrations, and sketches. Find the perfect design for your collection or project.',
    keywords: ['fashion designs', 'fashion illustrations', 'fashion sketches', 'digital designs', 'pattern designs']
  },
  designers: {
    title: 'Top Fashion Designers',
    description: 'Discover talented fashion designers from around the world. Browse portfolios, view designs, and commission custom work.',
    keywords: ['fashion designers', 'illustrators', 'fashion artists', 'design portfolio']
  },
  boutique: {
    title: 'Fashion Boutique - Physical Products',
    description: 'Shop unique fashion items, accessories, and designer pieces. Authentic products from verified sellers.',
    keywords: ['fashion boutique', 'designer clothes', 'fashion accessories', 'unique fashion']
  },
  commissions: {
    title: 'Custom Design Commissions',
    description: 'Commission custom fashion designs from talented artists. Get personalized illustrations, sketches, and patterns for your brand.',
    keywords: ['custom designs', 'commission artist', 'custom fashion illustration', 'bespoke designs']
  },
  contests: {
    title: 'Design Contests',
    description: 'Participate in fashion design contests and competitions. Showcase your talent and win prizes.',
    keywords: ['design contests', 'fashion competitions', 'design challenges']
  },
  forum: {
    title: 'Fashion Design Community',
    description: 'Join discussions with fellow fashion designers. Share tips, get feedback, and grow your network.',
    keywords: ['fashion community', 'designer forum', 'fashion discussions']
  },
  help: {
    title: 'Help Center',
    description: 'Get help with your Fashion Marketplace account. Find answers to common questions about buying, selling, and payments.',
    keywords: ['help', 'support', 'FAQ', 'customer service']
  },
  buyerProtection: {
    title: 'Buyer Protection Guarantee',
    description: 'Shop with confidence. Every purchase is protected by our comprehensive buyer protection program with 30-day coverage.',
    keywords: ['buyer protection', 'purchase guarantee', 'secure shopping', 'money back guarantee']
  },
  trending: {
    title: 'Trending Designs',
    description: 'Discover the most popular and trending fashion designs right now. See what other buyers are loving.',
    keywords: ['trending designs', 'popular fashion', 'best sellers', 'top designs']
  },
  categories: {
    title: 'Design Categories',
    description: 'Browse fashion designs by category. Find illustrations, sketches, patterns, and more.',
    keywords: ['design categories', 'fashion categories', 'browse designs']
  },
  contact: {
    title: 'Contact Us',
    description: 'Get in touch with our team. We\'re here to help with any questions about Fashion Marketplace.',
    keywords: ['contact', 'support', 'help', 'customer service']
  },
  terms: {
    title: 'Terms of Service',
    description: 'Read our terms of service and user agreement for Fashion Marketplace.',
    keywords: ['terms of service', 'user agreement', 'legal']
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Learn how we protect your privacy and handle your data at Fashion Marketplace.',
    keywords: ['privacy policy', 'data protection', 'GDPR']
  },
  resources: {
    title: 'Seller Resources',
    description: 'Resources and guides for fashion designers. Learn how to succeed on Fashion Marketplace.',
    keywords: ['seller resources', 'designer guides', 'selling tips']
  }
} as const
