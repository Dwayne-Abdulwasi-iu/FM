/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const requests = await prisma.commissionRequest.findMany({
      select: {
        id: true,
        status: true,
        designerId: true,
        designerName: true,
        title: true,
        requesterId: true,
        requesterName: true
      }
    });
    console.log('Commission Requests:', JSON.stringify(requests, null, 2));

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    console.log('Users:', JSON.stringify(users, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
