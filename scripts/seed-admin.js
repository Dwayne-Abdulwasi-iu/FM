const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'fashion@fashionmarketplace.store';
  const password = 'Abdulwasiu2000';
  const name = 'Admin';
  const role = 'ADMIN';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists:', email);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: '+234',
      role,
    },
  });
  console.log('Admin user created:', user.email);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());