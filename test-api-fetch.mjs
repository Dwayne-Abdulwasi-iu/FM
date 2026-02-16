#!/usr/bin/env node

import { fetch as nodeFetch } from 'node-fetch';

async function testAPICall() {
  try {
    console.log('🔍 Testing API endpoint with fetch...\n');
    
    // Get the seller's session token somehow or test without it
    const response = await nodeFetch('http://localhost:3000/api/boutique/seller/warehouse-expiration', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}\n`);

    const body = await response.text();
    console.log('Response Body:');
    console.log(body);

    if (response.ok) {
      try {
        const data = JSON.parse(body);
        console.log(`\n✅ Products returned: ${data.count || 0}`);
      } catch (e) {
        console.log('\n❌ Failed to parse JSON');
      }
    } else {
      console.log(`\n❌ API returned error: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
  }
}

testAPICall();
