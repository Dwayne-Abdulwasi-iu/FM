import prisma from '../src/lib/prisma';

async function testMongoConnection() {
  try {
    // Try to count users in the database
    const userCount = await prisma.user.count();
    console.log('MongoDB connection successful. User count:', userCount);
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMongoConnection();
