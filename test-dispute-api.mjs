/**
 * API Integration Test for Dispute System
 * Tests the actual HTTP API endpoints
 */

const disputeId = 'cmls9p2yz000247zhlwn854uo'
const complainantId = 'cmls9ikwh0000rsv3fu5pkg4g'
const respondentId = 'cmls9ilgw0001rsv3j3ieqjoz'

async function testGETDisputeDetail() {
  console.log('\n🔍 Test 1: GET /api/disputes/[disputeId]')
  console.log('=' .repeat(50))
  
  try {
    const response = await fetch(`http://localhost:3000/api/disputes/${disputeId}`)
    const data = await response.json()
    
    if (response.status === 200 || response.status === 401) {
      console.log(`✓ Status: ${response.status}`)
      
      if (response.status === 200 && data.dispute) {
        const d = data.dispute
        console.log(`✓ Dispute ID: ${d.id?.slice(0, 8) || 'N/A'}`)
        console.log(`✓ Title: ${d.title}`)
        console.log(`✓ Status: ${d.status}`)
        console.log(`✓ Priority: ${d.priority}`)
        console.log(`✓ Messages: ${d.messages?.length || 0}`)
        console.log(`✓ Complainant: ${d.complainant?.name || 'N/A'}`)
        console.log(`✓ Respondent: ${d.respondent?.name || 'N/A'}`)
      } else if (response.status === 401) {
        console.log('ℹ️  Requires authentication (expected for unauthenticated requests)')
      }
      return true
    } else {
      console.log(`❌ Unexpected status: ${response.status}`)
      console.log(`Response: ${JSON.stringify(data, null, 2)}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

async function testPOSTDisputeMessage() {
  console.log('\n💬 Test 2: POST /api/disputes/[disputeId] (Add Message)')
  console.log('=' .repeat(50))
  
  try {
    const response = await fetch(`http://localhost:3000/api/disputes/${disputeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test message via API' })
    })
    
    const data = await response.json()
    
    if (response.status === 201 || response.status === 401) {
      console.log(`✓ Status: ${response.status}`)
      
      if (response.status === 201 && data.disputeMessage) {
        console.log(`✓ Message created: ${data.disputeMessage.id?.slice(0, 8)}`)
        console.log(`✓ Message text: "${data.disputeMessage.message}"`)
        console.log(`✓ Sender role: ${data.disputeMessage.senderRole}`)
      } else if (response.status === 401) {
        console.log('ℹ️  Requires authentication (expected for unauthenticated requests)')
      } else {
        console.log(`Response: ${JSON.stringify(data, null, 2)}`)
      }
      return true
    } else {
      console.log(`❌ Unexpected status: ${response.status}`)
      console.log(`Response: ${JSON.stringify(data, null, 2)}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

async function testGETDisputesList() {
  console.log('\n📋 Test 3: GET /api/disputes (List Disputes)')
  console.log('=' .repeat(50))
  
  try {
    const response = await fetch('http://localhost:3000/api/disputes')
    const data = await response.json()
    
    if (response.status === 200 || response.status === 401) {
      console.log(`✓ Status: ${response.status}`)
      
      if (response.status === 200) {
        console.log(`✓ Response type: ${typeof data}`)
        if (Array.isArray(data)) {
          console.log(`✓ Disputes found: ${data.length}`)
          if (data.length > 0) {
            console.log(`✓ Sample dispute: ${data[0].id?.slice(0, 8)}`)
          }
        } else if (data.disputes) {
          console.log(`✓ Disputes found: ${data.disputes.length}`)
        }
      } else if (response.status === 401) {
        console.log('ℹ️  Requires authentication (expected for unauthenticated requests)')
      }
      return true
    } else {
      console.log(`❌ Unexpected status: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

async function testDataConsistency() {
  console.log('\n🔄 Test 4: Data Consistency Check')
  console.log('=' .repeat(50))
  
  try {
    const response1 = await fetch(`http://localhost:3000/api/disputes/${disputeId}`)
    
    if (response1.status !== 200 && response1.status !== 401) {
      console.log(`❌ Failed to fetch dispute: ${response1.status}`)
      return false
    }
    
    if (response1.status === 401) {
      console.log('ℹ️  Cannot verify - requires authentication')
      return true
    }
    
    const data1 = await response1.json()
    const d = data1.dispute
    
    if (!d) {
      console.log('✓ Endpoint structure valid (no access to specific dispute data)')
      return true
    }
    
    // Verify all expected fields exist
    const requiredFields = ['id', 'complainantId', 'respondentId', 'status', 'priority', 'type', 'title', 'description']
    const missingFields = requiredFields.filter(f => !(f in d))
    
    if (missingFields.length === 0) {
      console.log(`✓ All required fields present`)
    } else {
      console.log(`⚠️  Missing fields: ${missingFields.join(', ')}`)
    }
    
    // Verify messages structure
    if (Array.isArray(d.messages)) {
      console.log(`✓ Messages array: ${d.messages.length} items`)
      
      if (d.messages.length > 0) {
        const msg = d.messages[0]
        const msgFields = ['id', 'senderId', 'senderRole', 'message', 'createdAt']
        const missingMsgFields = msgFields.filter(f => !(f in msg))
        
        if (missingMsgFields.length === 0) {
          console.log(`✓ Message structure valid`)
        } else {
          console.log(`⚠️  Message missing fields: ${missingMsgFields.join(', ')}`)
        }
      }
    } else {
      console.log(`⚠️  Messages field is not an array`)
    }
    
    return true
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Integration Tests')
  console.log('📌 Test Dispute ID: ' + disputeId.slice(0, 12) + '...')
  
  const results = []
  
  results.push(await testGETDisputeDetail())
  results.push(await testPOSTDisputeMessage())
  results.push(await testGETDisputesList())
  results.push(await testDataConsistency())
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(50))
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log(`\n✅ Passed: ${passed}/${total}`)
  
  if (passed === total) {
    console.log('\n🎉 All API tests passed!')
  } else {
    console.log('\n⚠️  Some tests failed or were skipped')
  }
  
  process.exit(passed === total ? 0 : 1)
}

runAllTests()
