const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      displayName: true,
      role: true,
      email: true
    }
  });
  
  console.log('All users in database:');
  console.log(JSON.stringify(users, null, 2));
  
  const sellers = users.filter(u => u.role === 'SELLER');
  console.log(`\nTotal users: ${users.length}`);
  console.log(`Sellers: ${sellers.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
