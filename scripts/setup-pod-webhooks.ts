/**
 * POD Webhook Setup Script
 * 
 * Run with: npx tsx scripts/setup-pod-webhooks.ts
 * 
 * This script registers webhooks with Printful and Printify
 * and outputs the secrets to add to your .env file.
 */

import crypto from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config();

// Force production URL for webhook registration
const BASE_URL = 'https://fm-wtit.onrender.com';

async function setupPrintfulWebhook(): Promise<{ success: boolean; secret?: string; error?: string }> {
  const apiKey = process.env.PRINTFUL_API_KEY;
  
  if (!apiKey) {
    return { success: false, error: 'PRINTFUL_API_KEY not set' };
  }

  console.log('\n📦 Setting up Printful webhook...');
  
  try {
    // Check and delete existing webhooks
    const existingResponse = await fetch('https://api.printful.com/webhooks', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      const existingWebhooks = existingData.result?.types || [];
      const existingUrl = existingData.result?.url;
      
      if (existingUrl) {
        console.log(`   Removing old webhook: ${existingUrl}`);
        await fetch('https://api.printful.com/webhooks', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: existingUrl })
        });
      }
    }

    // Generate secret
    const secret = crypto.randomBytes(32).toString('hex');
    const webhookUrl = `${BASE_URL}/api/webhooks/printful`;

    console.log(`   Registering webhook: ${webhookUrl}`);

    // Register new webhook
    const response = await fetch('https://api.printful.com/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        types: [
          'package_shipped',
          'package_returned', 
          'order_created',
          'order_updated',
          'order_failed',
          'order_canceled'
        ]
      })
    });

    if (response.ok) {
      console.log('   ✅ Printful webhook registered successfully!');
      return { success: true, secret };
    } else {
      const error = await response.json().catch(() => ({}));
      console.log('   ❌ Printful registration failed:', error);
      return { success: false, error: JSON.stringify(error) };
    }
  } catch (error) {
    console.log('   ❌ Error:', error);
    return { success: false, error: String(error) };
  }
}

async function setupPrintifyWebhook(): Promise<{ success: boolean; secret?: string; error?: string }> {
  const apiKey = process.env.PRINTIFY_API_KEY;
  const shopId = process.env.PRINTIFY_SHOP_ID;
  
  if (!apiKey || !shopId) {
    return { success: false, error: 'PRINTIFY_API_KEY or PRINTIFY_SHOP_ID not set' };
  }

  console.log('\n🖨️  Setting up Printify webhook...');
  
  try {
    // Check and delete existing webhooks
    const existingResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/webhooks.json`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    );

    if (existingResponse.ok) {
      const existingWebhooks = await existingResponse.json();
      
      for (const webhook of existingWebhooks) {
        if (webhook.id) {
          console.log(`   Removing old webhook: ${webhook.topic} - ${webhook.url}`);
          await fetch(
            `https://api.printify.com/v1/shops/${shopId}/webhooks/${webhook.id}.json`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${apiKey}` }
            }
          );
        }
      }
    }

    // Generate secret
    const secret = crypto.randomBytes(32).toString('hex');
    const webhookUrl = `${BASE_URL}/api/webhooks/printify`;

    // Printify webhook topics
    const topics = [
      'order:created',
      'order:updated',
      'order:shipped',
      'order:send-to-production',
      'order:canceled',
      'order:delivery:completed',   // For delivery confirmation
      'order:delivery:failed'       // For failed deliveries
    ];

    console.log(`   Registering webhooks for ${topics.length} event types...`);

    let successCount = 0;
    for (const topic of topics) {
      const response = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            topic,
            url: webhookUrl,
            secret
          })
        }
      );

      if (response.ok) {
        successCount++;
        console.log(`   ✅ ${topic}`);
      } else {
        const error = await response.json().catch(() => ({}));
        console.log(`   ❌ ${topic}: ${JSON.stringify(error)}`);
      }
    }

    if (successCount > 0) {
      console.log(`   ✅ Printify webhooks registered (${successCount}/${topics.length})!`);
      return { success: true, secret };
    } else {
      return { success: false, error: 'No webhooks registered' };
    }
  } catch (error) {
    console.log('   ❌ Error:', error);
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log('🔧 POD Webhook Setup Script');
  console.log('============================');
  console.log(`Base URL: ${BASE_URL}`);

  const printfulResult = await setupPrintfulWebhook();
  const printifyResult = await setupPrintifyWebhook();

  console.log('\n============================');
  console.log('📋 RESULTS');
  console.log('============================\n');

  if (printfulResult.success || printifyResult.success) {
    console.log('Add these to your .env file:\n');
    
    if (printfulResult.success && printfulResult.secret) {
      console.log(`PRINTFUL_WEBHOOK_SECRET=${printfulResult.secret}`);
    }
    
    if (printifyResult.success && printifyResult.secret) {
      console.log(`PRINTIFY_WEBHOOK_SECRET=${printifyResult.secret}`);
    }
    
    console.log('\n');
  }

  if (!printfulResult.success) {
    console.log(`❌ Printful: ${printfulResult.error}`);
  }
  
  if (!printifyResult.success) {
    console.log(`❌ Printify: ${printifyResult.error}`);
  }

  // Return secrets for programmatic use
  return {
    printful: printfulResult,
    printify: printifyResult
  };
}

main().catch(console.error);
