import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.design.updateMany({
      where: {
        featured: undefined,
      },
      data: {
        featured: false,
      },
    });

    console.log(`Updated ${result.count} designs with featured: false`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
