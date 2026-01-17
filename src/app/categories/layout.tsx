import { Metadata } from 'next'
import { generateSEOMetadata, SEO_CONFIGS } from '@/lib/seo-config'

export const metadata: Metadata = generateSEOMetadata(SEO_CONFIGS.categories)

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
