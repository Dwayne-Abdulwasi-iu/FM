import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdminUsers() {
  try {
    console.log('\n👤 CHECKING ADMIN USERS\n');

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        role: true,
      }
    });

    console.log(`Found ${admins.length} admin users:`);
    admins.forEach((admin, i) => {
      console.log(`\n${i + 1}. ${admin.email}`);
      console.log(`   Name: ${admin.name || admin.displayName || 'N/A'}`);
      console.log(`   Role: ${admin.role}`);
    });

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminUsers()
