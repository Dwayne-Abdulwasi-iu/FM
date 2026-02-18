// Test the API endpoint directly with the database
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function testAPI() {
  try {
    console.log('📊 Testing Appeal API Logic...\n');

    // Simulate status=PENDING, sort=newest
    const status = 'PENDING';
    const sort = 'newest';
    const appealType = 'all';

    console.log(`Fetching with: status=${status}, sort=${sort}, appealType=${appealType}\n`);

    // Fetch variant discrepancy appeals
    let variantAppeals = [];
    if (appealType === 'all' || appealType === 'discrepancy') {
      variantAppeals = await prisma.variantDiscrepancyAppeal.findMany({
        where: status === 'all' ? {} : { appealStatus: status },
        take: 100,
      });
      console.log(`✅ Variant Discrepancy Appeals found: ${variantAppeals.length}`);
    }

    // Fetch dispute appeals with proper status mapping
    let disputeAppeals = [];
    if (appealType === 'all' || appealType === 'dispute') {
      let whereCondition = {};
      if (status !== 'all') {
        if (status === 'PENDING') {
          whereCondition = { status: { in: ['SUBMITTED', 'PENDING'] } };
        } else if (status === 'APPROVED') {
          whereCondition = { status: 'APPROVED' };
        } else if (status === 'REJECTED') {
          whereCondition = { status: 'DENIED' };
        }
      }

      disputeAppeals = await prisma.disputeAppeal.findMany({
        where: whereCondition,
        include: {
          seller: { select: { id: true, name: true, email: true } },
        },
        take: 100,
      }).then(appeals =>
        appeals.map(a => ({
          ...a,
          type: 'dispute',
          appealTitle: `Dispute ${a.originalDisputeNumber}`,
          sellerName: a.seller?.name || 'Unknown Seller',
          sellerEmail: a.seller?.email || '',
          appealStatus: a.status,
        }))
      );
      console.log(`✅ Dispute Appeals found: ${disputeAppeals.length}`);
    }

    // Combine and sort
    const allAppeals = [...variantAppeals, ...disputeAppeals];
    if (sort === 'oldest') {
      allAppeals.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      allAppeals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    console.log(`\n✅ Total Appeals: ${allAppeals.length}`);
    console.log('\nAppeals Details:');
    allAppeals.forEach((a, i) => {
      console.log(`\n${i + 1}. ${a.appealTitle}`);
      console.log(`   Type: ${a.type}`);
      console.log(`   Status: ${a.appealStatus || a.status}`);
      console.log(`   Seller: ${a.sellerName} (${a.sellerEmail})`);
      console.log(`   Created: ${new Date(a.createdAt).toLocaleString()}`);
    });

    console.log('\n✅ API Test Complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
