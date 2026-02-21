import { Metadata } from 'next'
import { generateSEOMetadata, SEO_CONFIGS } from '@/lib/seo-config'

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generateSEOMetadata(SEO_CONFIGS.boutique)

export default function BoutiqueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
