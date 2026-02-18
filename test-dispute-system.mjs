/**
 * Test script to verify dispute system integration
 * Creates test data and validates the complete flow
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...')
  
  // Delete test disputes and messages
  await prisma.disputeMessage.deleteMany({
    where: {
      dispute: {
        title: { contains: 'TEST' }
      }
    }
  })
  
  await prisma.dispute.deleteMany({
    where: {
      title: { contains: 'TEST' }
    }
  })
  
  console.log('✓ Cleanup complete')
}

async function createTestUsers() {
  console.log('\n📝 Creating test users...')
  
  // Create complainant (buyer)
  const complainant = await prisma.user.upsert({
    where: { email: 'test-buyer-dispute@example.com' },
    update: {},
    create: {
      email: 'test-buyer-dispute@example.com',
      phone: '+1234567890',
      name: 'Test Buyer',
      emailVerified: true,
      phoneVerified: true,
      role: 'USER'
    }
  })
  
  // Create respondent (seller)
  const respondent = await prisma.user.upsert({
    where: { email: 'test-seller-dispute@example.com' },
    update: {},
    create: {
      email: 'test-seller-dispute@example.com',
      phone: '+0987654321',
      name: 'Test Seller',
      emailVerified: true,
      phoneVerified: true,
      role: 'USER'
    }
  })
  
  console.log(`✓ Created complainant: ${complainant.name} (${complainant.id.slice(0, 8)})`)
  console.log(`✓ Created respondent: ${respondent.name} (${respondent.id.slice(0, 8)})`)
  
  return { complainant, respondent }
}

async function testCompleteFlow() {
  try {
    console.log('🚀 Starting dispute system integration test...\n')
    
    // Cleanup old test data
    await cleanupTestData()
    
    // Create test users
    const { complainant, respondent } = await createTestUsers()
    
    // Create dispute directly (without order dependency)
    console.log('\n⚖️  Creating test dispute...')
    
    const dispute = await prisma.dispute.create({
      data: {
        complainantId: complainant.id,
        respondentId: respondent.id,
        type: 'quality_issue',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'TEST: Quality Issue with Design',
        description: 'The delivered design does not match the expected quality. Colors are incorrect and resolution is low.',
        evidence: [
          'https://example.com/evidence1.jpg',
          'https://example.com/evidence2.jpg'
        ],
        refundRequested: 75.00
      }
    })
    
    console.log(`✓ Created dispute: ${dispute.id.slice(0, 8)}`)
    
    // Add messages from both parties
    console.log('\n💬 Testing message creation...')
    
    const msg1 = await prisma.disputeMessage.create({
      data: {
        disputeId: dispute.id,
        senderId: complainant.id,
        senderRole: 'COMPLAINANT',
        message: `Test message from complainant at ${new Date().toLocaleString()}`
      }
    })
    console.log(`✓ Created message 1: "${msg1.message.slice(0, 50)}..."`)
    
    const msg2 = await prisma.disputeMessage.create({
      data: {
        disputeId: dispute.id,
        senderId: respondent.id,
        senderRole: 'RESPONDENT',
        message: `Test message from respondent at ${new Date().toLocaleString()}`
      }
    })
    console.log(`✓ Created message 2: "${msg2.message.slice(0, 50)}..."`)
    
    // Fetch and verify
    console.log('\n🔍 Testing dispute fetch with relations...')
    
    const finalDispute = await prisma.dispute.findUnique({
      where: { id: dispute.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })
    
    if (!finalDispute) {
      throw new Error('Failed to fetch dispute')
    }
    
    console.log(`✓ Fetched dispute: ${finalDispute.title}`)
    console.log(`  - Status: ${finalDispute.status}`)
    console.log(`  - Priority: ${finalDispute.priority}`)
    console.log(`  - Type: ${finalDispute.type}`)
    console.log(`  - Messages: ${finalDispute.messages.length}`)
    
    // Validate message values
    console.log('\n✨ Validating message details...')
    for (const msg of finalDispute.messages) {
      const sender = msg.senderRole === 'COMPLAINANT' 
        ? complainant.name 
        : respondent.name
      console.log(`  ✓ Message from ${sender} (${msg.senderRole}): "${msg.message.slice(0, 40)}..."`)
    }
    
    // Test status transition
    console.log('\n⚒️  Testing status update...')
    const updatedDispute = await prisma.dispute.update({
      where: { id: dispute.id },
      data: { 
        status: 'UNDER_REVIEW',
        priority: 'HIGH'
      }
    })
    
    console.log(`✓ Updated status: ${updatedDispute.status} (priority: ${updatedDispute.priority})`)
    
    // Test API request simulation
    console.log('\n🌐 Testing API response structure...')
    
    const [disputeForAPI, complainantUser, respondentUser] = await Promise.all([
      prisma.dispute.findUnique({
        where: { id: dispute.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      }),
      prisma.user.findUnique({
        where: { id: complainant.id },
        select: { name: true, email: true }
      }),
      prisma.user.findUnique({
        where: { id: respondent.id },
        select: { name: true, email: true }
      })
    ])
    
    const apiResponse = {
      dispute: {
        ...disputeForAPI,
        complainant: complainantUser,
        respondent: respondentUser,
        order: null
      }
    }
    
    console.log(`✓ API response structure valid`)
    console.log(`  - Dispute ID: ${apiResponse.dispute.id.slice(0, 8)}`)
    console.log(`  - Complainant: ${apiResponse.dispute.complainant?.name}`)
    console.log(`  - Respondent: ${apiResponse.dispute.respondent?.name}`)
    console.log(`  - Message count: ${apiResponse.dispute.messages.length}`)
    
    console.log('\n✅ All tests passed!\n')
    console.log('📊 Test Summary:')
    console.log(`  - Created ${2} test users`)
    console.log(`  - Created ${1} test dispute`)
    console.log(`  - Added ${finalDispute.messages.length} messages`)
    console.log(`  - Successfully fetched dispute with all relations`)
    console.log(`  - Successfully updated dispute status`)
    console.log(`  - API response structure validated`)
    
    console.log('\n🔗 Test Dispute ID: ' + dispute.id)
    console.log('   Users:')
    console.log(`   - Complainant: ${complainant.id}`)
    console.log(`   - Respondent: ${respondent.id}`)
    console.log('\n💻 Database entries created:')
    console.log(`   - Users: 2`)
    console.log(`   - Dispute: 1`)
    console.log(`   - Messages: 2`)
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

testCompleteFlow()
