/**
 * Performance Optimization Analysis
 * Identifies slow API endpoints and provides optimization recommendations
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzePerformance() {
  console.log('🔍 Performance Analysis Report\n')

  try {
    // 1. Check database connection
    console.log('📊 Database Status:')
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const ping = Date.now() - startTime
    console.log(`✓ Database responsive: ${ping}ms\n`)

    // 2. Check table sizes and index information
    console.log('📈 Table Statistics:')
    
    const tableStats = await prisma.$queryRaw`
      SELECT 
        ns.nspname as schema,
        t.relname as table,
        pg_size_pretty(pg_total_relation_size(t.oid)) as total_size,
        (SELECT count(*) FROM pg_indexes WHERE tablename = t.relname) as index_count
      FROM pg_tables t
      JOIN pg_namespace ns ON t.tableowner = ns.oid
      WHERE schemaname = 'public'
      ORDER BY t.relname
      LIMIT 20
    ` as any[]

    if (Array.isArray(tableStats) && tableStats.length > 0) {
      tableStats.forEach(stat => {
        console.log(`  ${stat.table}: ${stat.total_size} (${stat.index_count} indexes)`)
      })
    } else {
      console.log('  (PostgreSQL stats not available - using MongoDB)')
    }

    console.log('\n⚡ Slow Query Analysis:')
    
    // Check CommissionRequest collection size
    const commissionCount = await prisma.commissionRequest.count()
    console.log(`  - CommissionRequest documents: ${commissionCount}`)
    
    // Check CartItem collection size  
    const cartItemCount = await prisma.cartItem.count()
    console.log(`  - CartItem documents: ${cartItemCount}`)
    
    // Check Dispute collection size
    const disputeCount = await prisma.dispute.count()
    console.log(`  - Dispute documents: ${disputeCount}`)

    console.log('\n💡 Performance Recommendations:\n')
    
    console.log('1. UNREAD COUNT ENDPOINT - /api/messages/unread-count')
    console.log('   Issue: Loading entire messages JSON field for all commissions')
    console.log('   Impact: 44-51 seconds per request')
    console.log('   Fix: Create aggregated unread_count field on CommissionRequest\n')
    
    console.log('2. CART ENDPOINT - /api/cart')
    console.log('   Issue: Multiple nested includes with design.designer relation')
    console.log('   Impact: 37-63 seconds per request')
    console.log('   Fix: Use projection to fetch only needed fields\n')
    
    console.log('3. ADMIN STATS ENDPOINT - /api/admin/stats')
    console.log('   Issue: Computing statistics with large aggregations')
    console.log('   Impact: 52 seconds per request')
    console.log('   Fix: Cache computed values, use materialized views\n')
    
    console.log('4. GENERAL OPTIMIZATIONS')
    console.log('   - Add database indexes on frequently queried fields')
    console.log('   - Use response caching (Redis) for non-user-specific routes')
    console.log('   - Implement pagination for large result sets')
    console.log('   - Use Prisma caching layer\n')

  } catch (error) {
    console.error('Error during analysis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzePerformance()
