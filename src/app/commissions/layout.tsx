import { Metadata } from 'next'
import { generateSEOMetadata, SEO_CONFIGS } from '@/lib/seo-config'

export const metadata: Metadata = generateSEOMetadata(SEO_CONFIGS.commissions)

export default function CommissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
