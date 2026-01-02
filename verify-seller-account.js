const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function updateSellerAccount() {
  try {
    console.log('Updating seller account with verified Paystack details...');
    
    const updated = await p.sellerAccount.update({
      where: { id: 'cmhmgf7qc0001x8ikohatcawy' },
      data: {
        recipientCode: 'RCP_cdauski54rzjm1g',
        isVerified: true,
        subaccountCode: 'ACCT_hb0mrtbapxmljxq'
      }
    });

    console.log('\n✅ Seller account updated successfully!\n');
    console.log('Updated fields:');
    console.log(`  - recipientCode: ${updated.recipientCode}`);
    console.log(`  - isVerified: ${updated.isVerified}`);
    console.log(`  - subaccountCode: ${updated.subaccountCode}`);
    console.log(`\nSeller ${updated.userId} is now ready to receive payments!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating seller account:', error.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
}

updateSellerAccount();
