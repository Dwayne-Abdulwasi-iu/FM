// Seed boutique categories for physical fashion products
// Run with: node scripts/seed-boutique-categories.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOUTIQUE_CATEGORIES = [
  {
    name: 'Clothing',
    slug: 'clothing',
    icon: '👔',
    description: 'All types of garments and apparel',
    sortOrder: 1,
    children: [
      { name: 'Dresses', slug: 'dresses', icon: '👗', description: 'Gowns, midi, maxi, and casual dresses', sortOrder: 1 },
      { name: 'Tops & Blouses', slug: 'tops-blouses', icon: '👚', description: 'Shirts, blouses, crop tops, and tank tops', sortOrder: 2 },
      { name: 'Pants & Trousers', slug: 'pants-trousers', icon: '👖', description: 'Jeans, slacks, palazzo, and cargo pants', sortOrder: 3 },
      { name: 'Skirts', slug: 'skirts', icon: '🩱', description: 'Mini, midi, maxi, and pencil skirts', sortOrder: 4 },
      { name: 'Suits & Blazers', slug: 'suits-blazers', icon: '🤵', description: 'Business suits, blazers, and formal wear', sortOrder: 5 },
      { name: 'Jackets & Coats', slug: 'jackets-coats', icon: '🧥', description: 'Jackets, coats, and outerwear', sortOrder: 6 },
      { name: 'Jumpsuits & Rompers', slug: 'jumpsuits-rompers', icon: '🩲', description: 'One-piece outfits', sortOrder: 7 },
      { name: 'Shorts', slug: 'shorts', icon: '🩳', description: 'Casual and formal shorts', sortOrder: 8 },
      { name: 'Swimwear', slug: 'swimwear', icon: '👙', description: 'Bikinis, swimsuits, and cover-ups', sortOrder: 9 },
      { name: 'Activewear', slug: 'activewear', icon: '🏃', description: 'Sports and workout clothing', sortOrder: 10 },
      { name: 'Sleepwear', slug: 'sleepwear', icon: '🛏️', description: 'Pajamas, nightgowns, and robes', sortOrder: 11 },
      { name: 'Maternity', slug: 'maternity', icon: '🤰', description: 'Clothing for expecting mothers', sortOrder: 12 },
    ],
  },
  {
    name: 'Traditional & Native Wear',
    slug: 'traditional-native',
    icon: '🪘',
    description: 'Traditional African and cultural attire',
    sortOrder: 2,
    children: [
      { name: 'Ankara', slug: 'ankara', icon: '🇳🇬', description: 'Ankara print dresses, tops, and more', sortOrder: 1 },
      { name: 'Aso-Oke', slug: 'aso-oke', icon: '👘', description: 'Traditional Yoruba woven fabric attire', sortOrder: 2 },
      { name: 'Kente', slug: 'kente', icon: '🇬🇭', description: 'Ghanaian kente cloth and designs', sortOrder: 3 },
      { name: 'Adire', slug: 'adire', icon: '🎨', description: 'Tie-dye and batik traditional wear', sortOrder: 4 },
      { name: 'Agbada', slug: 'agbada', icon: '👔', description: 'Traditional flowing robes for men', sortOrder: 5 },
      { name: 'Kaftan', slug: 'kaftan', icon: '🧕', description: 'Long, flowing robes and gowns', sortOrder: 6 },
      { name: 'Dashiki', slug: 'dashiki', icon: '✨', description: 'Colorful embroidered shirts', sortOrder: 7 },
      { name: 'Boubou', slug: 'boubou', icon: '🌍', description: 'Wide-sleeved flowing robes', sortOrder: 8 },
      { name: 'George Wrapper', slug: 'george-wrapper', icon: '🎀', description: 'Indian George fabric outfits', sortOrder: 9 },
      { name: 'Lace Native', slug: 'lace-native', icon: '🪡', description: 'Lace fabric traditional wear', sortOrder: 10 },
      { name: 'Buba & Iro', slug: 'buba-iro', icon: '👩', description: 'Traditional Yoruba women\'s wear', sortOrder: 11 },
      { name: 'Senator Style', slug: 'senator', icon: '🎖️', description: 'Nigerian senator/native suits', sortOrder: 12 },
    ],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    icon: '👟',
    description: 'Shoes and all types of footwear',
    sortOrder: 3,
    children: [
      { name: 'Heels', slug: 'heels', icon: '👠', description: 'High heels, stilettos, and pumps', sortOrder: 1 },
      { name: 'Flats', slug: 'flats', icon: '🥿', description: 'Ballet flats, loafers, and slip-ons', sortOrder: 2 },
      { name: 'Sneakers', slug: 'sneakers', icon: '👟', description: 'Athletic and casual sneakers', sortOrder: 3 },
      { name: 'Sandals', slug: 'sandals', icon: '🩴', description: 'Open-toe sandals and slides', sortOrder: 4 },
      { name: 'Boots', slug: 'boots', icon: '👢', description: 'Ankle boots, knee-high, and more', sortOrder: 5 },
      { name: 'Wedges', slug: 'wedges', icon: '⛳', description: 'Platform and wedge heels', sortOrder: 6 },
      { name: 'Formal Shoes', slug: 'formal-shoes', icon: '👞', description: 'Oxford, derby, and dress shoes', sortOrder: 7 },
      { name: 'Slippers', slug: 'slippers', icon: '🥾', description: 'Indoor and outdoor slippers', sortOrder: 8 },
      { name: 'Traditional Footwear', slug: 'traditional-footwear', icon: '🦶', description: 'Beaded sandals and native shoes', sortOrder: 9 },
    ],
  },
  {
    name: 'Bags',
    slug: 'bags',
    icon: '👜',
    description: 'Handbags, travel bags, and accessories',
    sortOrder: 4,
    children: [
      { name: 'Handbags', slug: 'handbags', icon: '👜', description: 'Tote, satchel, and everyday bags', sortOrder: 1 },
      { name: 'Clutches', slug: 'clutches', icon: '💼', description: 'Evening clutches and pouches', sortOrder: 2 },
      { name: 'Backpacks', slug: 'backpacks', icon: '🎒', description: 'Fashion and casual backpacks', sortOrder: 3 },
      { name: 'Crossbody Bags', slug: 'crossbody-bags', icon: '👛', description: 'Shoulder and crossbody styles', sortOrder: 4 },
      { name: 'Travel Bags', slug: 'travel-bags', icon: '🧳', description: 'Luggage, duffels, and weekenders', sortOrder: 5 },
      { name: 'Laptop Bags', slug: 'laptop-bags', icon: '💻', description: 'Professional laptop carriers', sortOrder: 6 },
      { name: 'Wallets & Purses', slug: 'wallets-purses', icon: '💰', description: 'Wallets, card holders, and coin purses', sortOrder: 7 },
      { name: 'Traditional Bags', slug: 'traditional-bags', icon: '🪺', description: 'Beaded bags, raffia, and native styles', sortOrder: 8 },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    icon: '💎',
    description: 'Jewelry, watches, and fashion accessories',
    sortOrder: 5,
    children: [
      { name: 'Watches', slug: 'watches', icon: '⌚', description: 'Wristwatches and smart watches', sortOrder: 1 },
      { name: 'Jewelry', slug: 'jewelry', icon: '💍', description: 'Necklaces, earrings, rings, and bracelets', sortOrder: 2 },
      { name: 'Beads & Beaded Jewelry', slug: 'beads', icon: '📿', description: 'Traditional beaded accessories', sortOrder: 3 },
      { name: 'Belts', slug: 'belts', icon: '🪢', description: 'Fashion and formal belts', sortOrder: 4 },
      { name: 'Sunglasses', slug: 'sunglasses', icon: '🕶️', description: 'Designer and fashion sunglasses', sortOrder: 5 },
      { name: 'Scarves & Wraps', slug: 'scarves-wraps', icon: '🧣', description: 'Silk scarves, shawls, and wraps', sortOrder: 6 },
      { name: 'Hats & Caps', slug: 'hats-caps', icon: '🧢', description: 'Fashion hats, caps, and headwear', sortOrder: 7 },
      { name: 'Hair Accessories', slug: 'hair-accessories', icon: '🎀', description: 'Hair clips, bands, and accessories', sortOrder: 8 },
      { name: 'Ties & Bow Ties', slug: 'ties', icon: '👔', description: 'Neckties and bow ties', sortOrder: 9 },
      { name: 'Cufflinks', slug: 'cufflinks', icon: '🔘', description: 'Formal cufflinks and accessories', sortOrder: 10 },
    ],
  },
  {
    name: 'Beauty & Fragrance',
    slug: 'beauty-fragrance',
    icon: '💄',
    description: 'Perfumes, cosmetics, skincare, and beauty products',
    sortOrder: 6,
    children: [
      { name: 'Perfumes', slug: 'perfumes', icon: '🌸', description: 'Eau de parfum and fragrances', sortOrder: 1 },
      { name: 'Body Mists', slug: 'body-mists', icon: '💨', description: 'Light fragrance sprays', sortOrder: 2 },
      { name: 'Colognes', slug: 'colognes', icon: '👨', description: 'Men\'s colognes and aftershaves', sortOrder: 3 },
      { name: 'Cosmetics', slug: 'cosmetics', icon: '💄', description: 'Makeup, lipsticks, and foundations', sortOrder: 4 },
      { name: 'Skincare', slug: 'skincare', icon: '🧴', description: 'Serums, moisturizers, and cleansers', sortOrder: 5 },
      { name: 'Hair Care', slug: 'haircare', icon: '🧴', description: 'Shampoos, conditioners, and treatments', sortOrder: 6 },
      { name: 'Bath & Body', slug: 'bath-body', icon: '🛁', description: 'Bath products, body oils, and soaps', sortOrder: 7 },
    ],
  },
];

async function seedCategories() {
  console.log('🌱 Seeding boutique categories...\n');

  // First, clear any orphaned categories (old ones no longer in use)
  console.log('Cleaning up old categories...');
  const validSlugs = [];
  for (const category of BOUTIQUE_CATEGORIES) {
    validSlugs.push(category.slug);
    if (category.children) {
      for (const child of category.children) {
        validSlugs.push(child.slug);
      }
    }
  }

  const toDelete = await prisma.boutiqueCategory.findMany({
    where: {
      slug: {
        notIn: validSlugs,
      },
    },
  });

  for (const cat of toDelete) {
    // Delete children first
    await prisma.boutiqueCategory.deleteMany({
      where: { parentId: cat.id },
    });
    // Then delete parent
    await prisma.boutiqueCategory.delete({
      where: { id: cat.id },
    });
  }

  if (toDelete.length > 0) {
    console.log(`Deleted ${toDelete.length} old categories\n`);
  }

  let created = 0;
  let skipped = 0;

  for (const category of BOUTIQUE_CATEGORIES) {
    try {
      // Check if parent category exists
      const existing = await prisma.boutiqueCategory.findUnique({
        where: { slug: category.slug },
      });

      let parentCategory;
      if (existing) {
        console.log(`⏭️  Skipping "${category.name}" (already exists)`);
        parentCategory = existing;
        skipped++;
      } else {
        parentCategory = await prisma.boutiqueCategory.create({
          data: {
            name: category.name,
            slug: category.slug,
            icon: category.icon,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: true,
            isFeatured: category.sortOrder <= 5, // First 5 are featured
          },
        });
        console.log(`✅ Created "${category.name}"`);
        created++;
      }

      // Create children
      if (category.children) {
        for (const child of category.children) {
          const childExists = await prisma.boutiqueCategory.findUnique({
            where: { slug: child.slug },
          });

          if (childExists) {
            console.log(`   ⏭️  Skipping "${child.name}"`);
            skipped++;
          } else {
            await prisma.boutiqueCategory.create({
              data: {
                name: child.name,
                slug: child.slug,
                sortOrder: child.sortOrder,
                parentId: parentCategory.id,
                isActive: true,
              },
            });
            console.log(`   ✅ Created "${child.name}"`);
            created++;
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error with "${category.name}":`, error.message);
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
}

seedCategories()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
