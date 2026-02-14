import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAuditLogs() {
  try {
    const logs = await prisma.boutiqueOrderAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    })
    
    console.log(`Total audit logs found: ${logs.length}`)
    logs.forEach(log => {
      console.log(`- ID: ${log.id}`)
      console.log(`  Order: ${log.orderId}`)
      console.log(`  Action: ${log.action}`)
      console.log(`  Old Status: ${log.oldStatus} → New Status: ${log.newStatus}`)
      console.log(`  Created: ${log.createdAt}`)
      console.log(`  By: ${log.admin?.name || log.admin?.email || 'SYSTEM'}`)
      console.log('')
    })
  } catch (error) {
    console.error('Error querying audit logs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAuditLogs()
