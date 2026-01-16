// Add Caps and Scarves categories
// Run with: node scripts/add-caps-scarves.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCategories() {
  console.log('🌱 Adding Caps and Scarves categories...\n');

  // Add Caps as a new parent category with children
  const caps = await prisma.boutiqueCategory.upsert({
    where: { slug: 'caps' },
    update: {},
    create: {
      name: 'Caps & Hats',
      slug: 'caps',
      icon: '🧢',
      description: 'Caps, hats, and headwear',
      sortOrder: 11,
      isActive: true,
      isFeatured: false,
    },
  });
  console.log('✅ Created/Found: Caps & Hats');

  const capTypes = [
    { name: 'Baseball Caps', slug: 'baseball-caps', sortOrder: 1 },
    { name: 'Snapbacks', slug: 'snapbacks', sortOrder: 2 },
    { name: 'Beanies', slug: 'beanies', sortOrder: 3 },
    { name: 'Fedoras', slug: 'fedoras', sortOrder: 4 },
    { name: 'Bucket Hats', slug: 'bucket-hats', sortOrder: 5 },
    { name: 'Sun Hats', slug: 'sun-hats', sortOrder: 6 },
    { name: 'Berets', slug: 'berets', sortOrder: 7 },
    { name: 'Turbans', slug: 'turbans', sortOrder: 8 },
    { name: 'Visors', slug: 'visors', sortOrder: 9 },
  ];

  for (const cap of capTypes) {
    await prisma.boutiqueCategory.upsert({
      where: { slug: cap.slug },
      update: {},
      create: { ...cap, parentId: caps.id, isActive: true },
    });
    console.log('   ✅ ' + cap.name);
  }

  // Add Scarves as parent category with types
  const scarves = await prisma.boutiqueCategory.upsert({
    where: { slug: 'scarves-wraps' },
    update: {},
    create: {
      name: 'Scarves & Wraps',
      slug: 'scarves-wraps',
      icon: '🧣',
      description: 'Scarves, shawls, and wraps',
      sortOrder: 12,
      isActive: true,
      isFeatured: false,
    },
  });
  console.log('✅ Created/Found: Scarves & Wraps');

  const scarfTypes = [
    { name: 'Silk Scarves', slug: 'silk-scarves', sortOrder: 1 },
    { name: 'Wool Scarves', slug: 'wool-scarves', sortOrder: 2 },
    { name: 'Pashminas', slug: 'pashminas', sortOrder: 3 },
    { name: 'Shawls', slug: 'shawls', sortOrder: 4 },
    { name: 'Wraps', slug: 'wraps', sortOrder: 5 },
    { name: 'Infinity Scarves', slug: 'infinity-scarves', sortOrder: 6 },
    { name: 'Bandanas', slug: 'bandanas', sortOrder: 7 },
    { name: 'Head Scarves', slug: 'head-scarves', sortOrder: 8 },
  ];

  for (const scarf of scarfTypes) {
    await prisma.boutiqueCategory.upsert({
      where: { slug: scarf.slug },
      update: {},
      create: { ...scarf, parentId: scarves.id, isActive: true },
    });
    console.log('   ✅ ' + scarf.name);
  }

  console.log('\n✨ Done!');
}

addCategories()
  .finally(() => prisma.$disconnect());
