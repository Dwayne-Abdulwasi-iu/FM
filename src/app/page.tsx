import { Metadata } from 'next'
import { Hero } from "@/components/home/hero";
import { FeaturedDesigns } from "@/components/home/featured-designs";
import { FeaturedBoutiqueProducts } from "@/components/home/featured-boutique-products";
import { Categories } from "@/components/home/categories";
import { Stats } from "@/components/home/stats";
import { generateSEOMetadata, SEO_CONFIGS } from '@/lib/seo-config'

export const metadata: Metadata = generateSEOMetadata(SEO_CONFIGS.home)

export default function Home() {
  return (
    <div className="space-y-16">
      <Hero />
      <Categories />
      <FeaturedDesigns />
      <FeaturedBoutiqueProducts />
      <Stats />
    </div>
  );
}