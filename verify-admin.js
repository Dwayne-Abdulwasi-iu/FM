const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'fashion@fashionmarketplace.store' }
    });
    if (admin) {
      console.log('\n✅ ADMIN FOUND IN MONGODB:\n');
      console.log('   Email:', admin.email);
      console.log('   Name:', admin.name);
      console.log('   Role:', admin.role);
      console.log('   Phone:', admin.phone);
      console.log('   Created:', admin.createdAt);
      console.log('\n✅ DATABASE CONNECTION SUCCESSFUL\n');
    } else {
      console.log('\n❌ Admin not found in database\n');
    }
  } catch (err) {
    console.error('\n❌ DATABASE ERROR:\n', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
