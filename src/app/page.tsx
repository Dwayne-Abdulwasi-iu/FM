import { Hero } from "@/components/home/hero";
import { FeaturedDesigns } from "@/components/home/featured-designs";
import { Categories } from "@/components/home/categories";
import { Stats } from "@/components/home/stats";

export default function Home() {
  return (
    <div className="space-y-10 xs:space-y-12 md:space-y-16">
      <Hero />
      <Categories />
      <FeaturedDesigns />
      <Stats />
    </div>
  );
}