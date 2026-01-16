// Seed boutique categories for physical fashion products
// Run with: node scripts/seed-boutique-categories.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOUTIQUE_CATEGORIES = [
  {
    name: 'Dresses',
    slug: 'dresses',
    icon: '👗',
    description: 'Beautiful dresses for every occasion',
    sortOrder: 1,
    children: [
      { name: 'Casual Dresses', slug: 'casual-dresses', sortOrder: 1 },
      { name: 'Evening Dresses', slug: 'evening-dresses', sortOrder: 2 },
      { name: 'Maxi Dresses', slug: 'maxi-dresses', sortOrder: 3 },
      { name: 'Mini Dresses', slug: 'mini-dresses', sortOrder: 4 },
      { name: 'Midi Dresses', slug: 'midi-dresses', sortOrder: 5 },
    ],
  },
  {
    name: 'Tops',
    slug: 'tops',
    icon: '👚',
    description: 'Stylish tops and blouses',
    sortOrder: 2,
    children: [
      { name: 'Blouses', slug: 'blouses', sortOrder: 1 },
      { name: 'T-Shirts', slug: 't-shirts', sortOrder: 2 },
      { name: 'Tank Tops', slug: 'tank-tops', sortOrder: 3 },
      { name: 'Crop Tops', slug: 'crop-tops', sortOrder: 4 },
      { name: 'Bodysuits', slug: 'bodysuits', sortOrder: 5 },
    ],
  },
  {
    name: 'Bottoms',
    slug: 'bottoms',
    icon: '👖',
    description: 'Pants, skirts, and shorts',
    sortOrder: 3,
    children: [
      { name: 'Jeans', slug: 'jeans', sortOrder: 1 },
      { name: 'Trousers', slug: 'trousers', sortOrder: 2 },
      { name: 'Skirts', slug: 'skirts', sortOrder: 3 },
      { name: 'Shorts', slug: 'shorts', sortOrder: 4 },
      { name: 'Leggings', slug: 'leggings', sortOrder: 5 },
    ],
  },
  {
    name: 'Outerwear',
    slug: 'outerwear',
    icon: '🧥',
    description: 'Jackets, coats, and blazers',
    sortOrder: 4,
    children: [
      { name: 'Jackets', slug: 'jackets', sortOrder: 1 },
      { name: 'Coats', slug: 'coats', sortOrder: 2 },
      { name: 'Blazers', slug: 'blazers', sortOrder: 3 },
      { name: 'Cardigans', slug: 'cardigans', sortOrder: 4 },
      { name: 'Vests', slug: 'vests', sortOrder: 5 },
    ],
  },
  {
    name: 'Shoes',
    slug: 'shoes',
    icon: '👠',
    description: 'Footwear for every style',
    sortOrder: 5,
    children: [
      { name: 'Heels', slug: 'heels', sortOrder: 1 },
      { name: 'Flats', slug: 'flats', sortOrder: 2 },
      { name: 'Sneakers', slug: 'sneakers', sortOrder: 3 },
      { name: 'Boots', slug: 'boots', sortOrder: 4 },
      { name: 'Sandals', slug: 'sandals', sortOrder: 5 },
    ],
  },
  {
    name: 'Bags',
    slug: 'bags',
    icon: '👜',
    description: 'Handbags and accessories',
    sortOrder: 6,
    children: [
      { name: 'Handbags', slug: 'handbags', sortOrder: 1 },
      { name: 'Shoulder Bags', slug: 'shoulder-bags', sortOrder: 2 },
      { name: 'Clutches', slug: 'clutches', sortOrder: 3 },
      { name: 'Backpacks', slug: 'backpacks', sortOrder: 4 },
      { name: 'Tote Bags', slug: 'tote-bags', sortOrder: 5 },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    icon: '💍',
    description: 'Jewelry and fashion accessories',
    sortOrder: 7,
    children: [
      { name: 'Jewelry', slug: 'jewelry', sortOrder: 1 },
      { name: 'Scarves', slug: 'scarves', sortOrder: 2 },
      { name: 'Belts', slug: 'belts', sortOrder: 3 },
      { name: 'Hats', slug: 'hats', sortOrder: 4 },
      { name: 'Sunglasses', slug: 'sunglasses', sortOrder: 5 },
    ],
  },
  {
    name: 'Traditional',
    slug: 'traditional',
    icon: '🪭',
    description: 'Traditional and cultural attire',
    sortOrder: 8,
    children: [
      { name: 'Ankara', slug: 'ankara', sortOrder: 1 },
      { name: 'Aso-Oke', slug: 'aso-oke', sortOrder: 2 },
      { name: 'Agbada', slug: 'agbada', sortOrder: 3 },
      { name: 'Kaftans', slug: 'kaftans', sortOrder: 4 },
      { name: 'Lace', slug: 'lace', sortOrder: 5 },
    ],
  },
  {
    name: 'Activewear',
    slug: 'activewear',
    icon: '🏃',
    description: 'Sports and fitness clothing',
    sortOrder: 9,
    children: [
      { name: 'Sports Bras', slug: 'sports-bras', sortOrder: 1 },
      { name: 'Yoga Pants', slug: 'yoga-pants', sortOrder: 2 },
      { name: 'Athletic Tops', slug: 'athletic-tops', sortOrder: 3 },
      { name: 'Tracksuits', slug: 'tracksuits', sortOrder: 4 },
      { name: 'Gym Shorts', slug: 'gym-shorts', sortOrder: 5 },
    ],
  },
  {
    name: 'Swimwear',
    slug: 'swimwear',
    icon: '👙',
    description: 'Beach and pool attire',
    sortOrder: 10,
    children: [
      { name: 'Bikinis', slug: 'bikinis', sortOrder: 1 },
      { name: 'One-Pieces', slug: 'one-pieces', sortOrder: 2 },
      { name: 'Cover-Ups', slug: 'cover-ups', sortOrder: 3 },
    ],
  },
];

async function seedCategories() {
  console.log('🌱 Seeding boutique categories...\n');

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
