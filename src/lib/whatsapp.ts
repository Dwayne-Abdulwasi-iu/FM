/**
 * WhatsApp Business API Integration
 * 
 * Uses Meta's Cloud API for WhatsApp Business
 * 
 * Features:
 * - Send order confirmations
 * - Send shipping updates
 * - Designer notifications
 * - Customer support messages
 */

import axios from 'axios';

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
// Business account ID - for managing templates and account settings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';

const BASE_URL = 'https://graph.facebook.com/v18.0';

export function isWhatsAppConfigured(): boolean {
  return !!(WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}

export function getWhatsAppVerifyToken(): string {
  return WHATSAPP_VERIFY_TOKEN;
}

interface MessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
    image?: { link: string };
  }>;
  sub_type?: 'url' | 'quick_reply';
  index?: number;
}

/**
 * Format phone number for WhatsApp (remove +, spaces, dashes)
 */
export function formatWhatsAppNumber(phone: string): string {
  return phone.replace(/[\s\-+]/g, '');
}

/**
 * Send a text message
 */
export async function sendTextMessage(to: string, message: string): Promise<MessageResponse> {
  if (!isWhatsAppConfigured()) {
    console.log('[WhatsApp Demo] Would send to', to, ':', message);
    return { messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'demo' }] };
  }

  const phoneNumber = formatWhatsAppNumber(to);

  try {
    const response = await axios.post<MessageResponse>(
      `${BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('WhatsApp send error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`WhatsApp message failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Send a template message (pre-approved by WhatsApp)
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: TemplateComponent[]
): Promise<MessageResponse> {
  if (!isWhatsAppConfigured()) {
    console.log('[WhatsApp Demo] Would send template', templateName, 'to', to);
    return { messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'demo' }] };
  }

  const phoneNumber = formatWhatsAppNumber(to);

  try {
    const response = await axios.post<MessageResponse>(
      `${BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('WhatsApp template error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`WhatsApp template failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Send order confirmation
 */
export async function sendOrderConfirmation(
  to: string,
  orderDetails: {
    orderId: string;
    customerName: string;
    totalAmount: string;
    itemCount: number;
    designerName: string;
  }
): Promise<MessageResponse> {
  const message = `🎉 *Order Confirmed!*

Hi ${orderDetails.customerName}!

Your order *#${orderDetails.orderId}* has been confirmed.

📦 *Order Details:*
• ${orderDetails.itemCount} item(s)
• Total: ${orderDetails.totalAmount}
• Designer: ${orderDetails.designerName}

You'll receive download links shortly. Thank you for shopping with Fashion Marketplace!

Questions? Reply to this message for support.`;

  return sendTextMessage(to, message);
}

/**
 * Send new sale notification to designer
 */
export async function sendDesignerSaleNotification(
  to: string,
  saleDetails: {
    designTitle: string;
    saleAmount: string;
    buyerName: string;
    orderId: string;
  }
): Promise<MessageResponse> {
  const message = `💰 *New Sale!*

Great news! Your design has been purchased.

🎨 *Design:* ${saleDetails.designTitle}
💵 *Amount:* ${saleDetails.saleAmount}
👤 *Buyer:* ${saleDetails.buyerName}
📋 *Order:* #${saleDetails.orderId}

Log in to your dashboard to view details.`;

  return sendTextMessage(to, message);
}

/**
 * Send commission request notification
 */
export async function sendCommissionNotification(
  to: string,
  details: {
    type: 'new_request' | 'payment_received' | 'work_approved';
    clientName: string;
    amount?: string;
    projectTitle?: string;
  }
): Promise<MessageResponse> {
  let message = '';

  switch (details.type) {
    case 'new_request':
      message = `🎨 *New Commission Request!*

${details.clientName} wants to commission you for a custom design.

${details.projectTitle ? `📋 *Project:* ${details.projectTitle}\n` : ''}${details.amount ? `💰 *Budget:* ${details.amount}\n` : ''}

Log in to review and respond to this request.`;
      break;

    case 'payment_received':
      message = `💳 *Payment Received!*

${details.clientName} has made a payment for your commission.

💰 *Amount:* ${details.amount}

Funds are held in escrow until you complete the work.`;
      break;

    case 'work_approved':
      message = `✅ *Work Approved!*

Great news! ${details.clientName} has approved your work.

💰 *${details.amount}* has been released to your account.

Thank you for your excellent work!`;
      break;
  }

  return sendTextMessage(to, message);
}

/**
 * Send download ready notification
 */
export async function sendDownloadReady(
  to: string,
  details: {
    customerName: string;
    designTitle: string;
    downloadLink: string;
  }
): Promise<MessageResponse> {
  const message = `📥 *Your Download is Ready!*

Hi ${details.customerName}!

Your purchase of *${details.designTitle}* is ready for download.

🔗 Download here: ${details.downloadLink}

This link expires in 24 hours.

Enjoy your new design! 🎨`;

  return sendTextMessage(to, message);
}

/**
 * Send interactive button message
 */
export async function sendButtonMessage(
  to: string,
  headerText: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<MessageResponse> {
  if (!isWhatsAppConfigured()) {
    console.log('[WhatsApp Demo] Would send buttons to', to);
    return { messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'demo' }] };
  }

  const phoneNumber = formatWhatsAppNumber(to);

  try {
    const response = await axios.post<MessageResponse>(
      `${BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          action: {
            buttons: buttons.map((btn) => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title },
            })),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: unknown) {
    console.error('WhatsApp button error:', error);
    const axiosError = error as { response?: { data?: unknown } };
    throw new Error(`WhatsApp buttons failed: ${JSON.stringify(axiosError.response?.data || error)}`);
  }
}

/**
 * Generate WhatsApp click-to-chat URL
 */
export function getClickToChatUrl(phoneNumber: string, message?: string): string {
  const number = formatWhatsAppNumber(phoneNumber);
  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${number}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
}

/**
 * Generate WhatsApp business support URL
 */
export function getSupportChatUrl(message?: string): string {
  const supportNumber = process.env.WHATSAPP_SUPPORT_NUMBER || WHATSAPP_PHONE_NUMBER_ID;
  return getClickToChatUrl(supportNumber, message || 'Hi! I need help with Fashion Marketplace.');
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string };
          };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * Parse incoming WhatsApp webhook
 */
export function parseWebhookPayload(payload: WhatsAppWebhookPayload) {
  const messages: Array<{
    from: string;
    name: string;
    messageId: string;
    timestamp: Date;
    type: string;
    text?: string;
    buttonReply?: { id: string; title: string };
  }> = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      
      if (value.messages) {
        for (const msg of value.messages) {
          const contact = value.contacts?.find((c) => c.wa_id === msg.from);
          
          messages.push({
            from: msg.from,
            name: contact?.profile?.name || 'Unknown',
            messageId: msg.id,
            timestamp: new Date(parseInt(msg.timestamp) * 1000),
            type: msg.type,
            text: msg.text?.body,
            buttonReply: msg.interactive?.button_reply,
          });
        }
      }
    }
  }

  return messages;
}
