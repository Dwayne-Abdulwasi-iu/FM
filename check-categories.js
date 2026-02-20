const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Count without where
    const totalCount = await prisma.boutiqueCategory.count( );
    console.log(`Total count(): ${totalCount}`);

    // Count with empty where
    const emptyWhereCount = await prisma.boutiqueCategory.count({ where: {} });
    console.log(`Count with empty where: ${emptyWhereCount}`);

    // Get all without where
    const allNoWhere = await prisma.boutiqueCategory.findMany({ select: {parentId: true} });
    console.log(`findMany without where: ${allNoWhere.length}`);

    // Count various conditions
    const countNull = await prisma.boutiqueCategory.count({ where: { parentId: null } });
    console.log(`Count where parentId = null: ${countNull}`);

    const countNotNull = await prisma.boutiqueCategory.count({ where: { parentId: { not: null } } });
    console.log(`Count where parentId != null: ${countNotNull}`);

    // Get all and filter in memory
    const allRaw = await prisma.boutiqueCategory.findMany({
      select: { id: true, name: true, parentId: true }
    });

    const nullParents = allRaw.filter(c => c.parentId === null);
    const notNullParents = allRaw.filter(c => c.parentId !== null);

    console.log(`\nIn-memory filter:`);
    console.log(`  parentId === null: ${nullParents.length}`);
    console.log(`  parentId !== null: ${notNullParents.length}`);
    console.log(`  Total: ${nullParents.length + notNullParents.length}`);

    if (nullParents.length > 0) {
      console.log(`\nNull parent categories (${nullParents.length}):`);
      nullParents.forEach(c => console.log(`  - ${c.name}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
