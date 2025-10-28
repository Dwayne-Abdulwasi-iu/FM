const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function makeAdmin() {
  const prisma = new PrismaClient();
  
  try {
    // Get the first user's email or you can specify an email
    const users = await prisma.user.findMany({
      take: 1,
      orderBy: { createdAt: 'asc' }
    });
    
    if (users.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }
    
    const user = users[0];
    console.log(`Making ${user.email} an admin...`);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        role: 'ADMIN',
        isVerified: true
      }
    });
    
    console.log(`✅ Successfully made ${updatedUser.email} an admin!`);
    console.log(`User ID: ${updatedUser.id}`);
    console.log(`Role: ${updatedUser.role}`);
    console.log(`Verified: ${updatedUser.isVerified}`);
    
  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();