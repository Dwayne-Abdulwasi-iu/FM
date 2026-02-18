import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAPITransform() {
  try {
    console.log('\n📊 Testing API Transform Logic with createdAt fix...\n');

    // Simulate exactly what the API does NOW
    const appealType = 'all';
    const status = 'PENDING';
    const sort = 'newest';

    // Fetch dispute appeals
    let whereCondition = {};
    if (status === 'PENDING') {
      whereCondition = { status: { in: ['SUBMITTED', 'PENDING'] } };
    }

    const raw = await prisma.disputeAppeal.findMany({
      where: whereCondition,
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
      take: 100,
    });

    console.log(`📊 Raw disputes: ${raw.length}`);

    const transformed = raw.map(a => ({
      ...a,
      type: 'dispute',
      appealTitle: `Dispute ${a.originalDisputeNumber}`,
      sellerName: a.seller?.name || 'Unknown Seller',
      sellerEmail: a.seller?.email || '',
      appealStatus: a.status,
      createdAt: a.submittedAt, // ✅ NOW INCLUDES createdAt
    }));

    console.log(`✅ Transformed: ${transformed.length}`);

    if (transformed.length > 0) {
      const a = transformed[0];
      console.log('\n📋 Appeal has createdAt now:');
      console.log(`  createdAt: ${a.createdAt}`);
      console.log(`  submittedAt: ${a.submittedAt}`);
      console.log(`  status: ${a.status}`);
      console.log(`  appealTitle: ${a.appealTitle}`);
      
      const daysOld = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      console.log(`  daysOld: ${daysOld}`);
    }

    console.log('\n✅ Ready for UI!');

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testAPITransform()
