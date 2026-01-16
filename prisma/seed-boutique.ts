// Seed Boutique Categories and Default Settings
import prisma from '../src/lib/prisma';
import { BOUTIQUE_CATEGORIES } from '../src/lib/boutique/categories';
import { BOUTIQUE_DEFAULTS } from '../src/lib/boutique/constants';

async function seedBoutiqueCategories() {
  console.log('🏪 Seeding Boutique Categories...\n');

  // Seed parent categories first
  for (const category of BOUTIQUE_CATEGORIES) {
    const parent = await prisma.boutiqueCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        isActive: true,
        isFeatured: true,
        sortOrder: BOUTIQUE_CATEGORIES.indexOf(category),
      },
      update: {
        name: category.name,
        icon: category.icon,
        description: category.description,
      },
    });

    console.log(`✅ Created parent category: ${parent.name}`);

    // Seed subcategories
    if (category.subcategories) {
      for (const sub of category.subcategories) {
        await prisma.boutiqueCategory.upsert({
          where: { slug: sub.slug },
          create: {
            name: sub.name,
            slug: sub.slug,
            icon: sub.icon,
            description: sub.description,
            parentId: parent.id,
            isActive: true,
            sortOrder: category.subcategories.indexOf(sub),
          },
          update: {
            name: sub.name,
            icon: sub.icon,
            description: sub.description,
            parentId: parent.id,
          },
        });
        console.log(`   └─ ${sub.name}`);
      }
    }
  }

  console.log('\n📦 Categories seeded successfully!');
}

async function seedBoutiqueSettings() {
  console.log('\n⚙️ Seeding Boutique Settings...\n');

  // Check if settings already exist
  const existingSettings = await prisma.boutiqueSettings.findFirst();

  if (existingSettings) {
    console.log('Settings already exist, updating...');
    await prisma.boutiqueSettings.update({
      where: { id: existingSettings.id },
      data: {
        platformCommission: BOUTIQUE_DEFAULTS.platformCommission,
        freeStorageDays: BOUTIQUE_DEFAULTS.freeStorageDays,
        storageFeePct: BOUTIQUE_DEFAULTS.storageFeePct,
        maxStorageDays: BOUTIQUE_DEFAULTS.maxStorageDays,
        shipmentDeadlineDays: BOUTIQUE_DEFAULTS.shipmentDeadlineDays,
        returnWindowDays: BOUTIQUE_DEFAULTS.returnWindowDays,
        liquidationDiscountPct: BOUTIQUE_DEFAULTS.liquidationDiscountPct,
        sellerLiquidationSharePct: BOUTIQUE_DEFAULTS.sellerLiquidationSharePct,
        minImages: BOUTIQUE_DEFAULTS.minImages,
        minVideos: BOUTIQUE_DEFAULTS.minVideos,
        warehouseAddress: {
          name: 'Fashion Marketplace Warehouse',
          street: '123 Fashion Avenue',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          postalCode: '100001',
          phone: '+234 800 000 0000',
        },
      },
    });
  } else {
    await prisma.boutiqueSettings.create({
      data: {
        platformCommission: BOUTIQUE_DEFAULTS.platformCommission,
        freeStorageDays: BOUTIQUE_DEFAULTS.freeStorageDays,
        storageFeePct: BOUTIQUE_DEFAULTS.storageFeePct,
        maxStorageDays: BOUTIQUE_DEFAULTS.maxStorageDays,
        shipmentDeadlineDays: BOUTIQUE_DEFAULTS.shipmentDeadlineDays,
        returnWindowDays: BOUTIQUE_DEFAULTS.returnWindowDays,
        liquidationDiscountPct: BOUTIQUE_DEFAULTS.liquidationDiscountPct,
        sellerLiquidationSharePct: BOUTIQUE_DEFAULTS.sellerLiquidationSharePct,
        minImages: BOUTIQUE_DEFAULTS.minImages,
        minVideos: BOUTIQUE_DEFAULTS.minVideos,
        warehouseAddress: {
          name: 'Fashion Marketplace Warehouse',
          street: '123 Fashion Avenue',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          postalCode: '100001',
          phone: '+234 800 000 0000',
        },
      },
    });
  }

  console.log('✅ Boutique settings configured:');
  console.log(`   Platform Commission: ${BOUTIQUE_DEFAULTS.platformCommission}%`);
  console.log(`   Free Storage: ${BOUTIQUE_DEFAULTS.freeStorageDays} days`);
  console.log(`   Storage Fee: ${BOUTIQUE_DEFAULTS.storageFeePct}% per month`);
  console.log(`   Max Storage: ${BOUTIQUE_DEFAULTS.maxStorageDays} days`);
  console.log(`   Shipment Deadline: ${BOUTIQUE_DEFAULTS.shipmentDeadlineDays} days`);
  console.log(`   Return Window: ${BOUTIQUE_DEFAULTS.returnWindowDays} days`);
}

async function seedShippingZones() {
  console.log('\n🚚 Seeding Shipping Zones...\n');

  const zones = [
    {
      name: 'Lagos',
      countries: ['NG'],
      states: ['Lagos'],
      baseRate: 2000,
      perKgRate: 200,
      freeShippingThreshold: 50000,
      minDays: 1,
      maxDays: 3,
    },
    {
      name: 'South-West Nigeria',
      countries: ['NG'],
      states: ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
      baseRate: 3000,
      perKgRate: 300,
      freeShippingThreshold: 75000,
      minDays: 2,
      maxDays: 5,
    },
    {
      name: 'South-South & South-East',
      countries: ['NG'],
      states: ['Rivers', 'Delta', 'Edo', 'Bayelsa', 'Akwa Ibom', 'Cross River', 'Anambra', 'Imo', 'Abia', 'Enugu', 'Ebonyi'],
      baseRate: 4000,
      perKgRate: 400,
      freeShippingThreshold: 100000,
      minDays: 3,
      maxDays: 7,
    },
    {
      name: 'North Nigeria',
      countries: ['NG'],
      states: ['FCT', 'Kaduna', 'Kano', 'Plateau', 'Kwara', 'Niger', 'Benue', 'Nasarawa', 'Kogi', 'Borno', 'Adamawa', 'Bauchi', 'Gombe', 'Taraba', 'Yobe', 'Jigawa', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
      baseRate: 5000,
      perKgRate: 500,
      freeShippingThreshold: 100000,
      minDays: 4,
      maxDays: 10,
    },
    {
      name: 'West Africa',
      countries: ['GH', 'CI', 'SN', 'BJ', 'TG', 'BF', 'ML', 'NE'],
      states: [],
      baseRate: 15000,
      perKgRate: 1500,
      freeShippingThreshold: null,
      minDays: 7,
      maxDays: 14,
    },
    {
      name: 'International',
      countries: ['US', 'GB', 'CA', 'DE', 'FR', 'AE', 'ZA'],
      states: [],
      baseRate: 25000,
      perKgRate: 3000,
      freeShippingThreshold: null,
      minDays: 10,
      maxDays: 21,
    },
  ];

  for (const zone of zones) {
    // Delete existing zone by name to avoid duplicates
    await prisma.shippingZone.deleteMany({
      where: { name: zone.name },
    });

    await prisma.shippingZone.create({
      data: zone,
    });

    console.log(`✅ Created shipping zone: ${zone.name} (₦${zone.baseRate} base, ${zone.minDays}-${zone.maxDays} days)`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     Fashion Boutique - Database Seed Script        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    await seedBoutiqueCategories();
    await seedBoutiqueSettings();
    await seedShippingZones();

    console.log('\n✨ All seeds completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
