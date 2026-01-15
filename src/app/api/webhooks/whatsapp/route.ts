import { NextRequest, NextResponse } from 'next/server';
import { parseWebhookPayload, getWhatsAppVerifyToken, WhatsAppWebhookPayload } from '@/lib/whatsapp';

/**
 * GET /api/webhooks/whatsapp - Webhook verification (required by Meta)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = getWhatsAppVerifyToken();

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('WhatsApp webhook verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp - Receive messages and status updates
 */
export async function POST(request: NextRequest) {
  try {
    const payload: WhatsAppWebhookPayload = await request.json();
    
    console.log('WhatsApp webhook received:', JSON.stringify(payload, null, 2));

    // Parse incoming messages
    const messages = parseWebhookPayload(payload);

    for (const message of messages) {
      console.log('Received WhatsApp message:', {
        from: message.from,
        name: message.name,
        type: message.type,
        text: message.text,
      });

      // Store the message for customer support
      // Note: This creates a simplified log entry - full WhatsApp conversation
      // tracking would require a dedicated WhatsAppMessage model
      if (message.text) {
        console.log('WhatsApp message from', message.from, ':', message.text);
        // WhatsApp messages are stored in external logs / CRM
        // The ChatMessage model is designed for in-app support chat
      }

      // Handle button replies
      if (message.buttonReply) {
        console.log('Button reply:', message.buttonReply);
        // Handle specific button actions (e.g., order confirmation, support options)
        await handleButtonReply(message.from, message.buttonReply);
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'received' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ status: 'error' });
  }
}

/**
 * Handle button reply actions
 */
async function handleButtonReply(
  from: string,
  buttonReply: { id: string; title: string }
) {
  // Handle different button actions
  switch (buttonReply.id) {
    case 'support_order':
      // User wants help with an order
      console.log(`User ${from} requested order support`);
      break;
    case 'support_refund':
      // User wants refund help
      console.log(`User ${from} requested refund support`);
      break;
    case 'support_other':
      // General support
      console.log(`User ${from} requested general support`);
      break;
    default:
      console.log(`Unknown button action: ${buttonReply.id}`);
  }
}
