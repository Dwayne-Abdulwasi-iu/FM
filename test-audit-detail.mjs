import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAuditLogDetail() {
  try {
    const log = await prisma.boutiqueOrderAuditLog.findUnique({
      where: { id: 'cml6inlwb0007xdbypffqsjey' },
    })
    
    console.log('Audit Log Raw:')
    console.log(JSON.stringify(log, null, 2))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAuditLogDetail()
