import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fashionmarketplace.com' },
    update: {},
    create: {
      email: 'admin@fashionmarketplace.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: adminPassword,
      isVerified: true,
    },
  })

  // Create sample designers
  const designerPassword = await bcrypt.hash('designer123', 12)
  const designers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        email: 'alice@example.com',
        name: 'Alice Johnson',
        role: 'DESIGNER',
        password: designerPassword,
        bio: 'Fashion illustrator with 5+ years of experience',
        location: 'New York, USA',
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        email: 'bob@example.com',
        name: 'Bob Smith',
        role: 'DESIGNER',
        password: designerPassword,
        bio: 'Digital fashion designer specializing in streetwear',
        location: 'London, UK',
        isVerified: true,
      },
    }),
  ])

  // Create sample designs
  const sampleDesigns = [
    {
      title: 'Summer Collection Sketch',
      description: 'Beautiful hand-drawn summer fashion sketches featuring flowing dresses and casual wear.',
      price: 29.99,
  imageUrl: '/images/placeholder-design.svg',
  thumbnailUrl: '/images/placeholder-design.svg',
      category: 'Fashion Illustrations',
      tags: ['summer','dresses','sketches'],
      designerId: designers[0].id,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
    {
      title: 'Street Style Digital Art',
      description: 'Modern digital fashion design with urban streetwear aesthetic.',
      price: 39.99,
  imageUrl: '/images/placeholder-design.svg',
  thumbnailUrl: '/images/placeholder-design.svg',
      category: 'Digital Designs',
      tags: ['streetwear','digital','urban'],
      designerId: designers[1].id,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
    {
      title: 'Vintage Pattern Collection',
      description: 'Retro-inspired patterns perfect for vintage fashion lovers.',
      price: 24.99,
  imageUrl: '/images/placeholder-design.svg',
  thumbnailUrl: '/images/placeholder-design.svg',
      category: 'Pattern Designs',
      tags: ['vintage','patterns','retro'],
      designerId: designers[0].id,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
  ]

  for (const design of sampleDesigns) {
    await prisma.design.create({
      data: design,
    })
  }

  // Create sample customer
  const customerPassword = await bcrypt.hash('customer123', 12)
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: 'Jane Customer',
      role: 'USER',
      password: customerPassword,
    },
  })

  console.log('✅ Database seeded successfully!')
  // Credentials for seeded users are not printed for security.
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })