import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function auditAllSystems() {
  try {
    console.log('\n📊 FULL SYSTEM AUDIT\n');
    console.log('='.repeat(50));

    // 1. Commission Disputes (for /admin/disputes)
    const commissionDisputes = await prisma.commissionRequest.findMany({
      where: { isDisputed: true },
      select: {
        id: true,
        title: true,
        isDisputed: true,
        disputeReason: true,
        createdAt: true
      },
      take: 5
    });
    console.log(`\n1️⃣  COMMISSION DISPUTES (/admin/disputes)`);
    console.log(`   Count: ${commissionDisputes.length}`);

    // 2. Seller Appeals - Variant Discrepancy
    const variantAppeals = await prisma.variantDiscrepancyAppeal.findMany({
      select: { id: true, appealStatus: true, createdAt: true },
      take: 5
    });
    console.log(`\n2️⃣  VARIANT DISCREPANCY APPEALS (/admin/boutique/appeals`);
    console.log(`   Count: ${variantAppeals.length}`);

    // 3. Seller Appeals - Dispute
    const disputeAppeals = await prisma.disputeAppeal.findMany({
      select: { id: true, status: true, submittedAt: true },
      take: 5
    });
    console.log(`\n3️⃣  DISPUTE APPEALS (/admin/boutique/appeals)`);
    console.log(`   Count: ${disputeAppeals.length}`);
    if (disputeAppeals.length > 0) {
      console.log(`   Status values: ${[...new Set(disputeAppeals.map(d => d.status))].join(', ')}`);
    }

    // 4. Order-level disputes
    const disputes = await prisma.dispute.findMany({
      select: { id: true, status: true, createdAt: true },
      take: 5
    });
    console.log(`\n4️⃣  ORDER DISPUTES (dispute-service)`);
    console.log(`   Count: ${disputes.length}`);

    console.log('\n' + '='.repeat(50));
    console.log('\n📋 SUMMARY');
    const total = commissionDisputes.length + variantAppeals.length + disputeAppeals.length + disputes.length;
    console.log(`   Total Items: ${total}`);
    console.log(`   Admin Disputes Page has data: ${commissionDisputes.length > 0 ? '✅' : '❌'}`);
    console.log(`   Appeals Page has data: ${(variantAppeals.length + disputeAppeals.length) > 0 ? '✅' : '❌'}`);
    console.log(`   Dispute Service has data: ${disputes.length > 0 ? '✅' : '❌'}`);

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

auditAllSystems()
