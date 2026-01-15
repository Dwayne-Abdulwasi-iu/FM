import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://fm-wtit.onrender.com';

/**
 * POST /api/admin/setup-pod-webhooks
 * Registers webhooks with Printful and Printify
 * 
 * This endpoint should only be called once during initial setup
 * or when webhook URLs need to be updated.
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const results: {
      printful?: { success: boolean; webhookId?: string; secret?: string; error?: string };
      printify?: { success: boolean; webhookId?: string; secret?: string; error?: string };
    } = {};

    // ============================================
    // Setup Printful Webhooks
    // ============================================
    if (process.env.PRINTFUL_API_KEY) {
      try {
        // First, check existing webhooks
        const existingResponse = await fetch('https://api.printful.com/webhooks', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
          }
        });

        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          const existingWebhooks = existingData.result || [];
          
          // Delete existing webhooks for our URL to avoid duplicates
          for (const webhook of existingWebhooks) {
            if (webhook.url?.includes('fm-wtit.onrender.com') || webhook.url?.includes('localhost')) {
              await fetch(`https://api.printful.com/webhooks`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: webhook.url })
              });
            }
          }
        }

        // Generate a webhook secret
        const printfulSecret = crypto.randomBytes(32).toString('hex');

        // Register new webhook
        const webhookResponse = await fetch('https://api.printful.com/webhooks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: `${BASE_URL}/api/webhooks/printful`,
            types: [
              'package_shipped',
              'package_returned',
              'order_created',
              'order_updated',
              'order_failed',
              'order_canceled'
            ],
            params: {
              secret: printfulSecret
            }
          })
        });

        if (webhookResponse.ok) {
          const data = await webhookResponse.json();
          results.printful = {
            success: true,
            webhookId: data.result?.id?.toString(),
            secret: printfulSecret
          };
          console.log('[Webhook Setup] Printful webhook registered successfully');
        } else {
          const errorData = await webhookResponse.json().catch(() => ({}));
          results.printful = {
            success: false,
            error: `Printful API error: ${webhookResponse.status} - ${JSON.stringify(errorData)}`
          };
        }
      } catch (error) {
        results.printful = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      results.printful = {
        success: false,
        error: 'PRINTFUL_API_KEY not configured'
      };
    }

    // ============================================
    // Setup Printify Webhooks
    // ============================================
    if (process.env.PRINTIFY_API_KEY && process.env.PRINTIFY_SHOP_ID) {
      try {
        const shopId = process.env.PRINTIFY_SHOP_ID;

        // First, check existing webhooks
        const existingResponse = await fetch(
          `https://api.printify.com/v1/shops/${shopId}/webhooks.json`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
            }
          }
        );

        if (existingResponse.ok) {
          const existingWebhooks = await existingResponse.json();
          
          // Delete existing webhooks for our URL
          for (const webhook of existingWebhooks) {
            if (webhook.url?.includes('fm-wtit.onrender.com') || webhook.url?.includes('localhost')) {
              await fetch(
                `https://api.printify.com/v1/shops/${shopId}/webhooks/${webhook.id}.json`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
                  }
                }
              );
            }
          }
        }

        // Generate a webhook secret
        const printifySecret = crypto.randomBytes(32).toString('hex');

        // Register new webhook
        const webhookResponse = await fetch(
          `https://api.printify.com/v1/shops/${shopId}/webhooks.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              topic: 'order:created',
              url: `${BASE_URL}/api/webhooks/printify`,
              secret: printifySecret
            })
          }
        );

        // Printify requires separate webhook for each event type
        const topics = [
          'order:updated',
          'order:shipped', 
          'order:send-to-production',
          'order:canceled',
          'order:delivery:completed',
          'order:delivery:failed'
        ];

        let mainWebhookId = '';
        
        if (webhookResponse.ok) {
          const data = await webhookResponse.json();
          mainWebhookId = data.id;
          
          // Register additional webhooks for other events
          for (const topic of topics) {
            await fetch(
              `https://api.printify.com/v1/shops/${shopId}/webhooks.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  topic,
                  url: `${BASE_URL}/api/webhooks/printify`,
                  secret: printifySecret
                })
              }
            );
          }
          
          results.printify = {
            success: true,
            webhookId: mainWebhookId,
            secret: printifySecret
          };
          console.log('[Webhook Setup] Printify webhooks registered successfully');
        } else {
          const errorData = await webhookResponse.json().catch(() => ({}));
          results.printify = {
            success: false,
            error: `Printify API error: ${webhookResponse.status} - ${JSON.stringify(errorData)}`
          };
        }
      } catch (error) {
        results.printify = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      results.printify = {
        success: false,
        error: 'PRINTIFY_API_KEY or PRINTIFY_SHOP_ID not configured'
      };
    }

    // Return results with secrets (admin should save these to .env)
    return NextResponse.json({
      success: true,
      message: 'Webhook registration complete. Save the secrets to your .env file!',
      results,
      envVarsToSet: {
        PRINTFUL_WEBHOOK_SECRET: results.printful?.secret || 'registration_failed',
        PRINTIFY_WEBHOOK_SECRET: results.printify?.secret || 'registration_failed'
      }
    });

  } catch (error) {
    console.error('[Webhook Setup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhooks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/setup-pod-webhooks
 * Check current webhook status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const status: {
      printful?: { configured: boolean; webhooks?: unknown[]; error?: string };
      printify?: { configured: boolean; webhooks?: unknown[]; error?: string };
    } = {};

    // Check Printful webhooks
    if (process.env.PRINTFUL_API_KEY) {
      try {
        const response = await fetch('https://api.printful.com/webhooks', {
          headers: { 'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}` }
        });
        if (response.ok) {
          const data = await response.json();
          status.printful = {
            configured: true,
            webhooks: data.result || []
          };
        } else {
          status.printful = { configured: false, error: `API error: ${response.status}` };
        }
      } catch (e) {
        status.printful = { configured: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    } else {
      status.printful = { configured: false, error: 'API key not set' };
    }

    // Check Printify webhooks
    if (process.env.PRINTIFY_API_KEY && process.env.PRINTIFY_SHOP_ID) {
      try {
        const response = await fetch(
          `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/webhooks.json`,
          { headers: { 'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}` } }
        );
        if (response.ok) {
          const data = await response.json();
          status.printify = {
            configured: true,
            webhooks: data || []
          };
        } else {
          status.printify = { configured: false, error: `API error: ${response.status}` };
        }
      } catch (e) {
        status.printify = { configured: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    } else {
      status.printify = { configured: false, error: 'API key or Shop ID not set' };
    }

    return NextResponse.json({
      webhookUrl: `${BASE_URL}/api/webhooks`,
      status
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check webhook status' },
      { status: 500 }
    );
  }
}
