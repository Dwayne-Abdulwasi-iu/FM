import { Metadata } from 'next'
import { generateSEOMetadata, SEO_CONFIGS } from '@/lib/seo-config'

export const metadata: Metadata = generateSEOMetadata(SEO_CONFIGS.contact)

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
