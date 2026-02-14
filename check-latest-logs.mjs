import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLatestAuditLogs() {
  try {
    const logs = await prisma.boutiqueOrderAuditLog.findMany({
      where: { orderId: 'cml6ilpch0001xdbylwzksq0n' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        admin: { select: { name: true, email: true } },
      },
    })
    
    console.log(`\nTotal audit logs for this order: ${logs.length}`)
    console.log('Latest 5 entries:')
    logs.forEach((log, idx) => {
      console.log(`\n${idx + 1}. ID: ${log.id}`)
      console.log(`   Action: ${log.action}`)
      console.log(`   Status: ${log.oldStatus} → ${log.newStatus}`)
      console.log(`   Created: ${log.createdAt}`)
      console.log(`   By: ${log.admin?.name || log.admin?.email || 'SYSTEM'}`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLatestAuditLogs()
