import { Metadata } from 'next'
import { generateSEOMetadata, SEO_CONFIGS } from '@/lib/seo-config'

export const metadata: Metadata = generateSEOMetadata(SEO_CONFIGS.buyerProtection)

export default function BuyerProtectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
