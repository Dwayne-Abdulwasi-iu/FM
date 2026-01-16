// Fashion Boutique - Category Definitions

export interface BoutiqueCategoryDefinition {
  name: string;
  slug: string;
  icon: string;
  description: string;
  subcategories?: BoutiqueCategoryDefinition[];
}

export const BOUTIQUE_CATEGORIES: BoutiqueCategoryDefinition[] = [
  {
    name: 'Clothing',
    slug: 'clothing',
    icon: '👔',
    description: 'All types of garments and apparel',
    subcategories: [
      { name: 'Dresses', slug: 'dresses', icon: '👗', description: 'Gowns, midi, maxi, and casual dresses' },
      { name: 'Tops & Blouses', slug: 'tops-blouses', icon: '👚', description: 'Shirts, blouses, crop tops, and tank tops' },
      { name: 'Pants & Trousers', slug: 'pants-trousers', icon: '👖', description: 'Jeans, slacks, palazzo, and cargo pants' },
      { name: 'Skirts', slug: 'skirts', icon: '🩱', description: 'Mini, midi, maxi, and pencil skirts' },
      { name: 'Suits & Blazers', slug: 'suits-blazers', icon: '🤵', description: 'Business suits, blazers, and formal wear' },
      { name: 'Jackets & Coats', slug: 'jackets-coats', icon: '🧥', description: 'Jackets, coats, and outerwear' },
      { name: 'Jumpsuits & Rompers', slug: 'jumpsuits-rompers', icon: '🩲', description: 'One-piece outfits' },
      { name: 'Shorts', slug: 'shorts', icon: '🩳', description: 'Casual and formal shorts' },
      { name: 'Swimwear', slug: 'swimwear', icon: '👙', description: 'Bikinis, swimsuits, and cover-ups' },
      { name: 'Activewear', slug: 'activewear', icon: '🏃', description: 'Sports and workout clothing' },
      { name: 'Sleepwear', slug: 'sleepwear', icon: '🛏️', description: 'Pajamas, nightgowns, and robes' },
      { name: 'Maternity', slug: 'maternity', icon: '🤰', description: 'Clothing for expecting mothers' },
    ]
  },
  {
    name: 'Traditional & Native Wear',
    slug: 'traditional-native',
    icon: '🪘',
    description: 'Traditional African and cultural attire',
    subcategories: [
      { name: 'Ankara', slug: 'ankara', icon: '🇳🇬', description: 'Ankara print dresses, tops, and more' },
      { name: 'Aso-Oke', slug: 'aso-oke', icon: '👘', description: 'Traditional Yoruba woven fabric attire' },
      { name: 'Kente', slug: 'kente', icon: '🇬🇭', description: 'Ghanaian kente cloth and designs' },
      { name: 'Adire', slug: 'adire', icon: '🎨', description: 'Tie-dye and batik traditional wear' },
      { name: 'Agbada', slug: 'agbada', icon: '👔', description: 'Traditional flowing robes for men' },
      { name: 'Kaftan', slug: 'kaftan', icon: '🧕', description: 'Long, flowing robes and gowns' },
      { name: 'Dashiki', slug: 'dashiki', icon: '✨', description: 'Colorful embroidered shirts' },
      { name: 'Boubou', slug: 'boubou', icon: '🌍', description: 'Wide-sleeved flowing robes' },
      { name: 'George Wrapper', slug: 'george-wrapper', icon: '🎀', description: 'Indian George fabric outfits' },
      { name: 'Lace Native', slug: 'lace-native', icon: '🪡', description: 'Lace fabric traditional wear' },
      { name: 'Buba & Iro', slug: 'buba-iro', icon: '👩', description: 'Traditional Yoruba women\'s wear' },
      { name: 'Senator Style', slug: 'senator', icon: '🎖️', description: 'Nigerian senator/native suits' },
    ]
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    icon: '👟',
    description: 'Shoes and all types of footwear',
    subcategories: [
      { name: 'Heels', slug: 'heels', icon: '👠', description: 'High heels, stilettos, and pumps' },
      { name: 'Flats', slug: 'flats', icon: '🥿', description: 'Ballet flats, loafers, and slip-ons' },
      { name: 'Sneakers', slug: 'sneakers', icon: '👟', description: 'Athletic and casual sneakers' },
      { name: 'Sandals', slug: 'sandals', icon: '🩴', description: 'Open-toe sandals and slides' },
      { name: 'Boots', slug: 'boots', icon: '👢', description: 'Ankle boots, knee-high, and more' },
      { name: 'Wedges', slug: 'wedges', icon: '⛳', description: 'Platform and wedge heels' },
      { name: 'Formal Shoes', slug: 'formal-shoes', icon: '👞', description: 'Oxford, derby, and dress shoes' },
      { name: 'Slippers', slug: 'slippers', icon: '🥾', description: 'Indoor and outdoor slippers' },
      { name: 'Traditional Footwear', slug: 'traditional-footwear', icon: '🦶', description: 'Beaded sandals and native shoes' },
    ]
  },
  {
    name: 'Bags',
    slug: 'bags',
    icon: '👜',
    description: 'Handbags, travel bags, and accessories',
    subcategories: [
      { name: 'Handbags', slug: 'handbags', icon: '👜', description: 'Tote, satchel, and everyday bags' },
      { name: 'Clutches', slug: 'clutches', icon: '💼', description: 'Evening clutches and pouches' },
      { name: 'Backpacks', slug: 'backpacks', icon: '🎒', description: 'Fashion and casual backpacks' },
      { name: 'Crossbody Bags', slug: 'crossbody-bags', icon: '👛', description: 'Shoulder and crossbody styles' },
      { name: 'Travel Bags', slug: 'travel-bags', icon: '🧳', description: 'Luggage, duffels, and weekenders' },
      { name: 'Laptop Bags', slug: 'laptop-bags', icon: '💻', description: 'Professional laptop carriers' },
      { name: 'Wallets & Purses', slug: 'wallets-purses', icon: '💰', description: 'Wallets, card holders, and coin purses' },
      { name: 'Traditional Bags', slug: 'traditional-bags', icon: '🪺', description: 'Beaded bags, raffia, and native styles' },
    ]
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    icon: '💎',
    description: 'Jewelry, watches, and fashion accessories',
    subcategories: [
      { name: 'Watches', slug: 'watches', icon: '⌚', description: 'Wristwatches and smart watches' },
      { name: 'Jewelry', slug: 'jewelry', icon: '💍', description: 'Necklaces, earrings, rings, and bracelets' },
      { name: 'Beads & Beaded Jewelry', slug: 'beads', icon: '📿', description: 'Traditional beaded accessories' },
      { name: 'Belts', slug: 'belts', icon: '🪢', description: 'Fashion and formal belts' },
      { name: 'Sunglasses', slug: 'sunglasses', icon: '🕶️', description: 'Designer and fashion sunglasses' },
      { name: 'Scarves & Wraps', slug: 'scarves-wraps', icon: '🧣', description: 'Silk scarves, shawls, and wraps' },
      { name: 'Hats & Caps', slug: 'hats-caps', icon: '🧢', description: 'Fashion hats, caps, and headwear' },
      { name: 'Hair Accessories', slug: 'hair-accessories', icon: '🎀', description: 'Hair clips, bands, and accessories' },
      { name: 'Ties & Bow Ties', slug: 'ties', icon: '👔', description: 'Neckties and bow ties' },
      { name: 'Cufflinks', slug: 'cufflinks', icon: '🔘', description: 'Formal cufflinks and accessories' },
    ]
  },
  {
    name: 'Head Gear',
    slug: 'head-gear',
    icon: '👒',
    description: 'Hats, caps, and head coverings',
    subcategories: [
      { name: 'Gele & Head Ties', slug: 'gele', icon: '👳‍♀️', description: 'Traditional African head wraps' },
      { name: 'Turbans', slug: 'turbans', icon: '🧕', description: 'Fashion turbans and wraps' },
      { name: 'Caps', slug: 'caps', icon: '🧢', description: 'Baseball caps and casual caps' },
      { name: 'Fila & Native Caps', slug: 'fila-caps', icon: '🎩', description: 'Traditional Nigerian caps' },
      { name: 'Fedoras & Hats', slug: 'fedoras-hats', icon: '👒', description: 'Fedoras, sun hats, and more' },
      { name: 'Bandanas', slug: 'bandanas', icon: '🏴‍☠️', description: 'Bandanas and head scarves' },
      { name: 'Beanies', slug: 'beanies', icon: '🎿', description: 'Knit beanies and winter hats' },
    ]
  },
  {
    name: 'Fabrics & Materials',
    slug: 'fabrics-materials',
    icon: '🧵',
    description: 'Unstitched fabrics for custom tailoring',
    subcategories: [
      { name: 'Ankara Fabric', slug: 'ankara-fabric', icon: '🎨', description: 'African print fabric by the yard' },
      { name: 'Lace Fabric', slug: 'lace-fabric', icon: '🪡', description: 'Swiss, French, and cord lace' },
      { name: 'Aso-Oke Fabric', slug: 'aso-oke-fabric', icon: '🧶', description: 'Handwoven traditional fabric' },
      { name: 'George Fabric', slug: 'george-fabric', icon: '✨', description: 'Indian George and wrapper fabric' },
      { name: 'Silk & Satin', slug: 'silk-satin', icon: '🎀', description: 'Silk and satin materials' },
      { name: 'Cotton Fabric', slug: 'cotton-fabric', icon: '🌾', description: 'Cotton and cotton blend fabrics' },
      { name: 'Velvet', slug: 'velvet', icon: '🍷', description: 'Velvet and velour materials' },
      { name: 'Embroidered Fabric', slug: 'embroidered-fabric', icon: '🪺', description: 'Pre-embroidered fabrics' },
    ]
  },
  {
    name: 'Kids Fashion',
    slug: 'kids-fashion',
    icon: '👶',
    description: 'Children\'s clothing and accessories',
    subcategories: [
      { name: 'Girls Clothing', slug: 'girls-clothing', icon: '👧', description: 'Dresses, tops, and outfits for girls' },
      { name: 'Boys Clothing', slug: 'boys-clothing', icon: '👦', description: 'Shirts, pants, and outfits for boys' },
      { name: 'Baby Clothing', slug: 'baby-clothing', icon: '👶', description: 'Onesies, rompers, and baby wear' },
      { name: 'Kids Footwear', slug: 'kids-footwear', icon: '👟', description: 'Shoes and sandals for children' },
      { name: 'Kids Accessories', slug: 'kids-accessories', icon: '🎀', description: 'Bags, hats, and accessories for kids' },
      { name: 'Kids Native Wear', slug: 'kids-native', icon: '🇳🇬', description: 'Traditional outfits for children' },
    ]
  },
];

// Flatten categories for easy lookup
export function getAllCategories(): BoutiqueCategoryDefinition[] {
  const all: BoutiqueCategoryDefinition[] = [];
  
  for (const category of BOUTIQUE_CATEGORIES) {
    all.push(category);
    if (category.subcategories) {
      all.push(...category.subcategories);
    }
  }
  
  return all;
}

// Get parent category by subcategory slug
export function getParentCategory(subcategorySlug: string): BoutiqueCategoryDefinition | null {
  for (const category of BOUTIQUE_CATEGORIES) {
    if (category.subcategories?.some(sub => sub.slug === subcategorySlug)) {
      return category;
    }
  }
  return null;
}

// Get category by slug
export function getCategoryBySlug(slug: string): BoutiqueCategoryDefinition | null {
  for (const category of BOUTIQUE_CATEGORIES) {
    if (category.slug === slug) return category;
    const sub = category.subcategories?.find(s => s.slug === slug);
    if (sub) return sub;
  }
  return null;
}

// Get all subcategories for a parent
export function getSubcategories(parentSlug: string): BoutiqueCategoryDefinition[] {
  const parent = BOUTIQUE_CATEGORIES.find(c => c.slug === parentSlug);
  return parent?.subcategories || [];
}
