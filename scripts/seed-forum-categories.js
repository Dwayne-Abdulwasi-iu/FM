/**
 * Seed Forum Categories
 * Run with: node scripts/seed-forum-categories.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const forumCategories = [
  {
    name: 'General Discussion',
    slug: 'general',
    description: 'Talk about anything fashion-related',
    icon: '💬',
    color: '#6366f1',
    sortOrder: 1,
  },
  {
    name: 'Design Feedback',
    slug: 'feedback',
    description: 'Get feedback on your designs from the community',
    icon: '🎨',
    color: '#8b5cf6',
    sortOrder: 2,
  },
  {
    name: 'Tutorials & Tips',
    slug: 'tutorials',
    description: 'Share and learn design techniques',
    icon: '📚',
    color: '#06b6d4',
    sortOrder: 3,
  },
  {
    name: 'Trends & Inspiration',
    slug: 'trends',
    description: 'Discuss current fashion trends and find inspiration',
    icon: '✨',
    color: '#f59e0b',
    sortOrder: 4,
  },
  {
    name: 'Business & Marketing',
    slug: 'business',
    description: 'Tips for selling and marketing your designs',
    icon: '💼',
    color: '#10b981',
    sortOrder: 5,
  },
  {
    name: 'Introductions',
    slug: 'introductions',
    description: 'Introduce yourself to the community',
    icon: '👋',
    color: '#ec4899',
    sortOrder: 6,
  },
  {
    name: 'Announcements',
    slug: 'announcements',
    description: 'Official announcements from Fashion Marketplace',
    icon: '📢',
    color: '#ef4444',
    sortOrder: 0,
  },
];

async function seedForumCategories() {
  console.log('🌱 Seeding forum categories...\n');

  for (const category of forumCategories) {
    try {
      const existing = await prisma.forumCategory.findUnique({
        where: { slug: category.slug },
      });

      if (existing) {
        console.log(`  ⏭️  Category "${category.name}" already exists, updating...`);
        await prisma.forumCategory.update({
          where: { slug: category.slug },
          data: category,
        });
      } else {
        await prisma.forumCategory.create({
          data: category,
        });
        console.log(`  ✅ Created category: ${category.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating "${category.name}":`, error.message);
    }
  }

  console.log('\n✨ Forum categories seeding complete!');
  
  // Show summary
  const count = await prisma.forumCategory.count();
  console.log(`   Total categories: ${count}\n`);
}

seedForumCategories()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
