const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

p.sellerAccount.findMany().then(accounts => {
  console.log('Seller Accounts:');
  console.log(JSON.stringify(accounts, null, 2));
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
