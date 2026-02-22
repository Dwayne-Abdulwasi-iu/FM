/**
 * Email Service for Fashion Marketplace Notifications
 * 
 * This service handles sending email notifications for various events.
 * Supports SendGrid API (primary) and SMTP (fallback) - SendGrid takes priority.
 * 
 * NOTE: This is a server-only module. Import only in server components and API routes.
 */

// Import and re-export sync config functions
export { isSMTPConfigured, isEmailConfigured } from '@/lib/email-config'
import { isSMTPConfigured, isEmailConfigured } from '@/lib/email-config'
import sgMail from '@sendgrid/mail'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transporter = any;

// Create transporter lazily
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  // Return cached transporter
  if (transporter) {
    return transporter;
  }

  // Use SMTP (SendGrid via SMTP or custom SMTP) as fallback
  if (isSMTPConfigured()) {
    // Support both SMTP_* and EMAIL_SERVER_* env variable names
    const host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
    const port = process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || '465';
    const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;
    const secure = process.env.SMTP_SECURE !== 'false'; // Default to true for port 465

    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure,
      auth: {
        user,
        pass,
      },
    });
    console.log(`[Email] Using SMTP transport (host: ${host}, port: ${port}, secure: ${secure})`);
    return transporter;
  }

  return null;
}

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@fashionmarketplace.com';
const APP_NAME = 'Fashion Marketplace';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// ============================================
// Email Utility: Branded Email Wrapper
// ============================================

/**
 * Wraps email content in a branded HTML template with header, footer, and consistent styling
 */
export function wrapBrandedEmail(subject: string, content: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body { background: #f4f4f8; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
      .email-container { max-width: 480px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px 24px; }
      .logo { text-align: center; margin-bottom: 24px; }
      .logo img { max-width: 120px; }
      h2 { color: #1e293b; }
      .cta-btn { display: inline-block; padding: 14px 28px; background: #4F46E5; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 24px 0; }
      .note, .security { background: #f1f5f9; padding: 14px; border-radius: 8px; margin: 18px 0; font-size: 15px; color: #334155; }
      .footer { color: #64748b; font-size: 13px; text-align: center; margin-top: 32px; }
      @media (max-width: 600px) {
        .email-container { padding: 16px 4vw; }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="logo">
        <img src="https://fashionmarketplace.store/logo.png" alt="Fashion Marketplace Logo" />
      </div>
      ${content}
      <div class="footer">
        Need help? <a href="mailto:support@fashionmarketplace.store" style="color:#4F46E5;">Contact support</a><br/>
        &copy; 2026 Fashion Marketplace
      </div>
    </div>
  </body>
</html>`;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Try SendGrid API first (most reliable, no SMTP port issues)
  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      await sgMail.send({
        to: options.to,
        from: FROM_EMAIL,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`[Email - SENT via SendGrid] To: ${options.to}, Subject: ${options.subject}`);
      return true;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = error;
      console.error(`[Email - SendGrid ERROR] Failed to send to ${options.to}:`, error);
      if (err.response?.body) {
        console.error('[Email - SendGrid Response]:', JSON.stringify(err.response.body));
      }
      // Fall through to SMTP fallback
    }
  }

  // Fallback to SMTP if SendGrid not configured or fails
  const transport = getTransporter();
  
  if (!transport) {
    console.log(`[Email - NOT SENT] To: ${options.to}, Subject: ${options.subject}`);
    console.log(`[Email] Configure SENDGRID_API_KEY or SMTP_HOST/PORT/USER/PASS to enable email`);
    return false;
  }

  try {
    await transport.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`[Email - SENT via SMTP] To: ${options.to}, Subject: ${options.subject}`);
    return true;
  } catch (error) {
    console.error(`[Email - SMTP ERROR] Failed to send to ${options.to}:`, error);
    return false;
  }
}

// ============================================
// Commission Request Email Templates
// ============================================

interface CommissionEmailData {
  requesterName: string;
  requesterEmail?: string;
  designerName: string;
  designerEmail: string;
  title: string;
  requestId?: string;
  commissionId?: string;
  quote?: number;
  amount?: number;
  designerEarnings?: number;
  deadline?: string;
  message?: string;
}

// Helper to ensure email is defined
function getEmail(email: string | undefined, fallback: string): string {
  return email || fallback;
}

/**
 * Notify admin when a new commission request is submitted
 */
export async function sendNewRequestToAdmin(data: CommissionEmailData): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('[Email] ADMIN_EMAIL not configured, skipping admin notification');
    return false;
  }

  return sendEmail({
    to: adminEmail,
    subject: `New Commission Request: ${data.title}`,
    html: `
      <h2>New Commission Request</h2>
      <p>A new commission request has been submitted and needs your review.</p>
      
      <h3>Request Details</h3>
      <ul>
        <li><strong>Title:</strong> ${data.title}</li>
        <li><strong>From:</strong> ${data.requesterName} (${data.requesterEmail})</li>
        <li><strong>For Designer:</strong> ${data.designerName}</li>
      </ul>
      
      <p>
        <a href="${BASE_URL}/admin/commission-requests" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          Review Request
        </a>
      </p>
    `,
  });
}

/**
 * Notify designer when admin forwards a request to them
 */
export async function sendRequestForwardedToDesigner(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: data.designerEmail,
    subject: `New Commission Request: ${data.title}`,
    html: `
      <h2>You Have a New Commission Request!</h2>
      <p>Hello ${data.designerName},</p>
      <p>A client is interested in commissioning custom work from you.</p>
      
      <h3>Request Details</h3>
      <ul>
        <li><strong>Title:</strong> ${data.title}</li>
        <li><strong>Client:</strong> ${data.requesterName}</li>
      </ul>
      
      <p>Please review the request and provide a quote or response.</p>
      
      <p>
        <a href="${BASE_URL}/seller/commission-requests" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Request
        </a>
      </p>
    `,
  });
}

/**
 * Notify client when designer sends a quote
 */
export async function sendQuoteToClient(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: getEmail(data.requesterEmail, data.designerEmail),
    subject: `Quote Received for: ${data.title}`,
    html: `
      <h2>You've Received a Quote!</h2>
      <p>Hello ${data.requesterName},</p>
      <p>${data.designerName} has provided a quote for your commission request.</p>
      
      <h3>Quote Details</h3>
      <ul>
        <li><strong>Price:</strong> $${data.quote?.toLocaleString()}</li>
        ${data.deadline ? `<li><strong>Estimated Delivery:</strong> ${data.deadline}</li>` : ''}
        ${data.message ? `<li><strong>Message:</strong> ${data.message}</li>` : ''}
      </ul>
      
      <p>If you're happy with the quote, proceed to payment to start the work.</p>
      
      <p>
        <a href="${BASE_URL}/commission-payment/${data.requestId}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;">
          Pay Now
        </a>
      </p>
    `,
  });
}

/**
 * Notify client when designer rejects their request
 */
export async function sendRejectionToClient(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: getEmail(data.requesterEmail, data.designerEmail),
    subject: `Commission Request Update: ${data.title}`,
    html: `
      <h2>Commission Request Update</h2>
      <p>Hello ${data.requesterName},</p>
      <p>Unfortunately, ${data.designerName} is unable to accept your commission request at this time.</p>
      
      ${data.message ? `<p><strong>Reason:</strong> ${data.message}</p>` : ''}
      
      <p>Don't worry! There are many talented designers on our platform. Browse our designers to find another match.</p>
      
      <p>
        <a href="${BASE_URL}/designers" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          Browse Designers
        </a>
      </p>
    `,
  });
}

/**
 * Notify designer when payment is received
 */
export async function sendPaymentReceivedToDesigner(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: data.designerEmail,
    subject: `Payment Received - Start Work: ${data.title}`,
    html: `
      <h2>Payment Received! 🎉</h2>
      <p>Hello ${data.designerName},</p>
      <p>Great news! ${data.requesterName} has paid for the commission "${data.title}".</p>
      
      <p>You can now start working on the commission. Once completed, upload your deliverables.</p>
      
      <p>
        <a href="${BASE_URL}/seller/commission-requests" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          Start Working
        </a>
      </p>
    `,
  });
}

/**
 * Notify client when designer starts work
 */
export async function sendWorkStartedToClient(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: getEmail(data.requesterEmail, data.designerEmail),
    subject: `Work Started: ${data.title}`,
    html: `
      <h2>Work Has Started!</h2>
      <p>Hello ${data.requesterName},</p>
      <p>${data.designerName} has started working on your commission "${data.title}".</p>
      
      ${data.deadline ? `<p><strong>Expected Delivery:</strong> ${data.deadline}</p>` : ''}
      
      <p>You'll be notified when the work is ready for your review.</p>
      
      <p>
        <a href="${BASE_URL}/my-commissions" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          Track Progress
        </a>
      </p>
    `,
  });
}

/**
 * Notify client when deliverables are ready for review
 */
export async function sendDeliverablesReadyToClient(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: getEmail(data.requesterEmail, data.designerEmail),
    subject: `Deliverables Ready: ${data.title}`,
    html: `
      <h2>Your Commission is Ready for Review! 🎨</h2>
      <p>Hello ${data.requesterName},</p>
      <p>${data.designerName} has completed work on "${data.title}" and uploaded the deliverables for your review.</p>
      
      <p>Please review the work and either approve it or request revisions.</p>
      
      <p>
        <a href="${BASE_URL}/my-commissions" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;">
          Review Deliverables
        </a>
      </p>
    `,
  });
}

/**
 * Notify designer when client requests revisions
 */
export async function sendRevisionRequestToDesigner(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: data.designerEmail,
    subject: `Revision Requested: ${data.title}`,
    html: `
      <h2>Revision Requested</h2>
      <p>Hello ${data.designerName},</p>
      <p>${data.requesterName} has requested revisions for "${data.title}".</p>
      
      ${data.message ? `<p><strong>Feedback:</strong> ${data.message}</p>` : ''}
      
      <p>Please review the feedback and upload updated deliverables.</p>
      
      <p>
        <a href="${BASE_URL}/seller/commission-requests" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Request
        </a>
      </p>
    `,
  });
}

/**
 * Notify designer when client approves and commission is complete
 */
export async function sendApprovalToDesigner(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: data.designerEmail,
    subject: `Commission Approved! ${data.title}`,
    html: `
      <h2>Commission Approved! 🎉</h2>
      <p>Hello ${data.designerName},</p>
      <p>Congratulations! ${data.requesterName} has approved your work on "${data.title}".</p>
      
      <p>Your earnings will be transferred to your account according to our payment schedule.</p>
      
      <p>
        <a href="${BASE_URL}/seller/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;">
          View Dashboard
        </a>
      </p>
    `,
  });
}

/**
 * Notify client that commission is complete
 */
export async function sendCompletionToClient(data: CommissionEmailData): Promise<boolean> {
  return sendEmail({
    to: getEmail(data.requesterEmail, data.designerEmail),
    subject: `Commission Complete: ${data.title}`,
    html: `
      <h2>Commission Complete! 🎨</h2>
      <p>Hello ${data.requesterName},</p>
      <p>Your commission "${data.title}" is now complete!</p>
      
      <p>We hope you love your custom design. Please consider leaving a review for ${data.designerName}.</p>
      
      <p>
        <a href="${BASE_URL}/my-commissions" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          Leave a Review
        </a>
      </p>
    `,
  });
}

/**
 * Notify admin about a dispute
 */
export async function sendDisputeToAdmin(data: CommissionEmailData & { disputeReason: string }): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;

  return sendEmail({
    to: adminEmail,
    subject: `⚠️ Dispute Filed: ${data.title}`,
    html: `
      <h2>Dispute Filed</h2>
      <p>A dispute has been filed for commission "${data.title}".</p>
      
      <h3>Details</h3>
      <ul>
        <li><strong>Client:</strong> ${data.requesterName} (${data.requesterEmail})</li>
        <li><strong>Designer:</strong> ${data.designerName} (${data.designerEmail})</li>
        <li><strong>Reason:</strong> ${data.disputeReason}</li>
      </ul>
      
      <p>
        <a href="${BASE_URL}/admin/commission-requests" style="display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px;">
          Review Dispute
        </a>
      </p>
    `,
  });
}

// ============================================
// Commission Monitoring Email Templates
// ============================================

/**
 * Warn designer about approaching deadline
 */
export async function sendDeadlineWarningToDesigner(data: {
  designerEmail: string;
  designerName: string;
  title: string;
  requestId: string;
  daysRemaining: number;
}): Promise<boolean> {
  return sendEmail({
    to: data.designerEmail,
    subject: `⏰ Deadline Approaching: ${data.title}`,
    html: `
      <h2>Deadline Approaching!</h2>
      <p>Hello ${data.designerName},</p>
      <p>Your commission "<strong>${data.title}</strong>" is due in <strong>${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}</strong>.</p>
      
      <p>Please make sure to deliver the work on time to maintain your reputation and avoid disputes.</p>
      
      <p>
        <a href="${BASE_URL}/seller/commission-requests" style="display: inline-block; padding: 12px 24px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px;">
          View Commission
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px;">
        If you need more time, please communicate with your client to request a deadline extension.
      </p>
    `,
  });
}

/**
 * Notify client that deadline has passed
 */
export async function sendDeadlinePassedToClient(data: {
  requesterEmail: string;
  requesterName: string;
  designerName: string;
  title: string;
  requestId: string;
  daysOverdue: number;
}): Promise<boolean> {
  return sendEmail({
    to: data.requesterEmail,
    subject: `⚠️ Commission Overdue: ${data.title}`,
    html: `
      <h2>Commission Deadline Passed</h2>
      <p>Hello ${data.requesterName},</p>
      <p>The deadline for your commission "<strong>${data.title}</strong>" has passed. It is now <strong>${data.daysOverdue} day${data.daysOverdue > 1 ? 's' : ''}</strong> overdue.</p>
      
      <p>Designer ${data.designerName} should deliver your work soon. If you'd like to:</p>
      <ul>
        <li>Contact the designer to check on progress</li>
        <li>File a dispute if you're unsatisfied with the delay</li>
      </ul>
      
      <p>
        <a href="${BASE_URL}/my-commissions" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Commission
        </a>
      </p>
    `,
  });
}

/**
 * Warn client about upcoming auto-release
 */
export async function sendAutoReleaseWarningToClient(data: {
  requesterEmail: string;
  requesterName: string;
  title: string;
  requestId: string;
  daysRemaining: number;
}): Promise<boolean> {
  return sendEmail({
    to: data.requesterEmail,
    subject: `⏰ Action Required: Confirm Delivery for ${data.title}`,
    html: `
      <h2>Please Confirm Your Delivery</h2>
      <p>Hello ${data.requesterName},</p>
      <p>Your commission "<strong>${data.title}</strong>" was delivered and is awaiting your confirmation.</p>
      
      <p style="background: #FEF3C7; padding: 16px; border-radius: 8px; border-left: 4px solid #F59E0B;">
        <strong>⚠️ Important:</strong> If you don't respond within <strong>${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}</strong>, 
        the commission will be automatically marked as complete and payment will be released to the designer.
      </p>
      
      <p>Please review the delivered work and either:</p>
      <ul>
        <li>✅ <strong>Approve</strong> - If you're satisfied with the work</li>
        <li>🔄 <strong>Request Revision</strong> - If changes are needed</li>
        <li>⚠️ <strong>File Dispute</strong> - If there's a serious issue</li>
      </ul>
      
      <p>
        <a href="${BASE_URL}/my-commissions" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;">
          Review & Confirm Delivery
        </a>
      </p>
    `,
  });
}

/**
 * Notify both parties about auto-completion
 */
export async function sendAutoCompletionNotice(data: {
  requesterEmail: string;
  requesterName: string;
  designerEmail: string;
  designerName: string;
  title: string;
  requestId: string;
}): Promise<boolean> {
  // Notify client
  await sendEmail({
    to: data.requesterEmail,
    subject: `✅ Commission Auto-Completed: ${data.title}`,
    html: `
      <h2>Commission Auto-Completed</h2>
      <p>Hello ${data.requesterName},</p>
      <p>Your commission "<strong>${data.title}</strong>" has been automatically marked as complete 
      after 14 days of delivery without response.</p>
      
      <p>Payment has been released to ${data.designerName}.</p>
      
      <p>If you have any issues with the delivered work, please contact our support team within 7 days.</p>
      
      <p>
        <a href="${BASE_URL}/my-commissions" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Commission
        </a>
      </p>
    `,
  });

  // Notify designer
  return sendEmail({
    to: data.designerEmail,
    subject: `💰 Payment Released: ${data.title}`,
    html: `
      <h2>Payment Released!</h2>
      <p>Hello ${data.designerName},</p>
      <p>Great news! Your commission "<strong>${data.title}</strong>" has been automatically 
      marked as complete and payment has been released to your account.</p>
      
      <p>The client did not respond within 14 days of delivery, so the system automatically completed the transaction.</p>
      
      <p>
        <a href="${BASE_URL}/seller/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;">
          View Dashboard
        </a>
      </p>
    `,
  });
}

/**
 * Warn designer about potential abandonment
 */
export async function sendAbandonmentWarningToDesigner(data: {
  designerEmail: string;
  designerName: string;
  title: string;
  requestId: string;
  daysRemaining: number;
}): Promise<boolean> {
  return sendEmail({
    to: data.designerEmail,
    subject: `🚨 Urgent: Start Work on ${data.title}`,
    html: `
      <h2>Action Required!</h2>
      <p>Hello ${data.designerName},</p>
      <p>You received payment for commission "<strong>${data.title}</strong>" but haven't started work yet.</p>
      
      <p style="background: #FEE2E2; padding: 16px; border-radius: 8px; border-left: 4px solid #EF4444;">
        <strong>⚠️ Warning:</strong> If you don't start work within <strong>${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}</strong>, 
        the commission will be <strong>cancelled and refunded</strong> to the client.
      </p>
      
      <p>Please:</p>
      <ol>
        <li>Start working on the commission</li>
        <li>Mark it as "In Progress" in your dashboard</li>
        <li>Communicate with your client about the timeline</li>
      </ol>
      
      <p>
        <a href="${BASE_URL}/seller/commission-requests" style="display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px;">
          Start Commission Now
        </a>
      </p>
    `,
  });
}

/**
 * Notify client about refund due to abandonment
 */
export async function sendRefundNoticeToClient(data: {
  requesterEmail: string;
  requesterName: string;
  title: string;
  requestId: string;
  amount: number;
  reason: string;
}): Promise<boolean> {
  return sendEmail({
    to: data.requesterEmail,
    subject: `💸 Refund Initiated: ${data.title}`,
    html: `
      <h2>Your Refund Has Been Initiated</h2>
      <p>Hello ${data.requesterName},</p>
      <p>We're sorry to inform you that your commission "<strong>${data.title}</strong>" has been cancelled.</p>
      
      <p><strong>Reason:</strong> ${data.reason}</p>
      
      <p>A refund of <strong>$${data.amount.toFixed(2)}</strong> has been initiated. 
      Please allow 5-10 business days for the funds to appear in your account.</p>
      
      <p>We apologize for any inconvenience. You can find other talented designers on our platform.</p>
      
      <p>
        <a href="${BASE_URL}/designers" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          Browse Designers
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px;">
        If you have questions about your refund, please contact our support team.
      </p>
    `,
  });
}

/**
 * Notify client about dispute resolution
 */
export async function sendDisputeResolvedToClient(data: {
  email: string;
  clientName: string;
  designerName: string;
  resolution: string;
  refundAmount?: number;
  notes?: string;
}): Promise<boolean> {
  const refundSection = data.refundAmount
    ? `<p><strong>Refund Amount:</strong> $${data.refundAmount.toFixed(2)}</p>
       <p>Please allow 5-10 business days for the refund to appear in your account.</p>`
    : "";

  return sendEmail({
    to: data.email,
    subject: `✅ Dispute Resolved - Your Commission with ${data.designerName}`,
    html: `
      <h2>Your Dispute Has Been Resolved</h2>
      <p>Hello ${data.clientName},</p>
      <p>Our team has reviewed your dispute regarding the commission with <strong>${data.designerName}</strong>.</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Resolution:</strong> ${data.resolution}</p>
        ${refundSection}
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
      </div>
      
      <p>If you have any questions about this resolution, please contact our support team.</p>
      
      <p>Thank you for your patience and understanding.</p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This decision was made by our support team after careful review of all evidence.
      </p>
    `,
  });
}

/**
 * Notify designer about dispute resolution
 */
export async function sendDisputeResolvedToDesigner(data: {
  email: string;
  designerName: string;
  clientName: string;
  resolution: string;
  payoutAmount?: number;
  notes?: string;
}): Promise<boolean> {
  const payoutSection = data.payoutAmount
    ? `<p><strong>Your Payout:</strong> $${data.payoutAmount.toFixed(2)}</p>
       <p>This amount will be transferred to your registered bank account.</p>`
    : "";

  return sendEmail({
    to: data.email,
    subject: `✅ Dispute Resolved - Commission with ${data.clientName}`,
    html: `
      <h2>Dispute Has Been Resolved</h2>
      <p>Hello ${data.designerName},</p>
      <p>Our team has reviewed the dispute regarding your commission with <strong>${data.clientName}</strong>.</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Resolution:</strong> ${data.resolution}</p>
        ${payoutSection}
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
      </div>
      
      <p>If you have any questions about this resolution, please contact our support team.</p>
      
      <p>
        <a href="${BASE_URL}/seller/commissions" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Your Commissions
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This decision was made by our support team after careful review of all evidence.
      </p>
    `,
  });
}

/**
 * Notify client about new message in commission
 */
export async function sendNewMessageToClient(data: {
  email: string;
  clientName: string;
  designerName: string;
  commissionTitle: string;
  commissionId: string;
  messagePreview: string;
}): Promise<boolean> {
  return sendEmail({
    to: data.email,
    subject: `💬 New Message from ${data.designerName} - ${data.commissionTitle}`,
    html: `
      <h2>New Message on Your Commission</h2>
      <p>Hello ${data.clientName},</p>
      <p><strong>${data.designerName}</strong> sent you a message about your commission "<strong>${data.commissionTitle}</strong>":</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">
        "${data.messagePreview.substring(0, 200)}${data.messagePreview.length > 200 ? "..." : ""}"
      </div>
      
      <p>
        <a href="${BASE_URL}/commissions/${data.commissionId}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View & Reply
        </a>
      </p>
    `,
  });
}

/**
 * Notify designer about new message in commission
 */
export async function sendNewMessageToDesigner(data: {
  email: string;
  designerName: string;
  clientName: string;
  commissionTitle: string;
  commissionId: string;
  messagePreview: string;
}): Promise<boolean> {
  return sendEmail({
    to: data.email,
    subject: `💬 New Message from ${data.clientName} - ${data.commissionTitle}`,
    html: `
      <h2>New Message on Commission</h2>
      <p>Hello ${data.designerName},</p>
      <p><strong>${data.clientName}</strong> sent you a message about the commission "<strong>${data.commissionTitle}</strong>":</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">
        "${data.messagePreview.substring(0, 200)}${data.messagePreview.length > 200 ? "..." : ""}"
      </div>
      
      <p>
        <a href="${BASE_URL}/seller/commissions/${data.commissionId}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View & Reply
        </a>
      </p>
    `,
  });
}

/**
 * Notify client about progress update from designer
 */
export async function sendProgressUpdateToClient(data: {
  email: string;
  clientName: string;
  designerName: string;
  commissionTitle: string;
  commissionId: string;
  updateMessage: string;
  hasPhotos: boolean;
}): Promise<boolean> {
  return sendEmail({
    to: data.email,
    subject: `📸 Progress Update: ${data.commissionTitle}`,
    html: `
      <h2>Progress Update on Your Commission</h2>
      <p>Hello ${data.clientName},</p>
      <p><strong>${data.designerName}</strong> has posted a progress update on your commission:</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p>${data.updateMessage}</p>
        ${data.hasPhotos ? "<p>📷 <em>Photos attached - view in your dashboard</em></p>" : ""}
      </div>
      
      <p>
        <a href="${BASE_URL}/commissions/${data.commissionId}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
          View Progress
        </a>
      </p>
    `,
  });
}

/**
 * Notify client when their physical item has been delivered
 */
export async function sendPhysicalDeliveryNotification(data: {
  email: string;
  clientName: string;
  commissionTitle: string;
  commissionId: string;
  trackingNumber?: string;
  courierName?: string;
}): Promise<boolean> {
  return sendEmail({
    to: data.email,
    subject: `📦 Your Package Has Been Delivered: ${data.commissionTitle}`,
    html: `
      <h2>Your Package Has Been Delivered!</h2>
      <p>Hello ${data.clientName},</p>
      <p>Great news! Your commissioned item "<strong>${data.commissionTitle}</strong>" has been delivered.</p>
      
      ${data.trackingNumber || data.courierName ? `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          ${data.courierName ? `<p><strong>Courier:</strong> ${data.courierName}</p>` : ''}
          ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
        </div>
      ` : ''}
      
      <p style="background: #FEF3C7; padding: 16px; border-radius: 8px; border-left: 4px solid #F59E0B;">
        <strong>⚠️ Important:</strong> Please confirm receipt of your package within <strong>14 days</strong>.
        If we don't hear from you, the order will be automatically marked as complete and payment will be released to the designer.
      </p>
      
      <p>Once you've received and inspected your item, please:</p>
      <ul>
        <li>✅ <strong>Confirm Delivery</strong> - If everything is as expected</li>
        <li>⚠️ <strong>Report Issue</strong> - If there's a problem with the item</li>
      </ul>
      
      <p>
        <a href="${BASE_URL}/my-commissions" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;">
          Confirm Delivery
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Thank you for using Fashion Marketplace!
      </p>
    `,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${BASE_URL}/auth/reset-password?token=${resetToken}`;
  const subject = '🔐 Reset Your Password - Fashion Marketplace';
  const content = `
    <h2>Reset Your Password</h2>
    <p>Hello ${userName || 'there'},</p>
    <p>You requested to reset your password. Click the button below to set a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="cta-btn">Reset Password</a>
    </div>
    
    <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; border-left: 4px solid #F59E0B;">
      <strong>⚠️ Important:</strong> This link will expire in <strong>1 hour</strong>.
    </div>
    
    <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
    
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="${resetUrl}" style="color: #4F46E5;">${resetUrl}</a>
    </p>
  `;
  
  return sendEmail({
    to: email,
    subject,
    html: wrapBrandedEmail(subject, content),
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  userName: string,
  verifyToken: string
): Promise<boolean> {
  const verifyUrl = `${BASE_URL}/auth/verify-email?token=${verifyToken}`;
  const subject = '✉️ Verify Your Email - Fashion Marketplace';
  const content = `
    <h2>Verify Your Email Address</h2>
    <p>Hello ${userName || 'there'},</p>
    <p>Welcome to Fashion Marketplace! Please verify your email address to unlock all features:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" class="cta-btn">Verify Email</a>
    </div>
    
    <div style="background: #E0F2FE; padding: 16px; border-radius: 8px; border-left: 4px solid #0EA5E9;">
      <strong>ℹ️ Note:</strong> This link will expire in <strong>24 hours</strong>.
    </div>
    
    <p style="color: #666; font-size: 14px;">Once verified, you'll be able to:</p>
    <ul style="color: #666;">
      <li>Purchase designs and access downloads</li>
      <li>Leave reviews on purchases</li>
      <li>Become a seller and upload designs</li>
    </ul>
    
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="${verifyUrl}" style="color: #0EA5E9;">${verifyUrl}</a>
    </p>
  `;
  
  return sendEmail({
    to: email,
    subject,
    html: wrapBrandedEmail(subject, content),
  });
}

/**
 * Send order confirmation email to buyer
 */
export async function sendOrderConfirmationEmail(
  email: string,
  userName: string,
  orderNumber: string,
  totalAmount: number,
  itemCount: number,
  items: Array<{ title: string; price: number; purchaseType: string }>
): Promise<boolean> {
  const orderUrl = `${BASE_URL}/orders`;
  const subject = `🎉 Order Confirmed - #${orderNumber}`;
  
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.purchaseType}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');
  
  const content = `
    <h2>Thank You for Your Order!</h2>
    <p>Hello ${userName || 'there'},</p>
    <p>Your order has been confirmed and your designs are ready to download.</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Order Number:</strong> ${orderNumber}</p>
      <p style="margin: 10px 0 0;"><strong>Total:</strong> $${totalAmount.toFixed(2)}</p>
    </div>
    
    <h3>Order Items</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 10px; text-align: left;">Design</th>
          <th style="padding: 10px; text-align: left;">Type</th>
          <th style="padding: 10px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" class="cta-btn">View Your Orders</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      You can download your purchased designs from your order history at any time.
    </p>
  `;
  
  return sendEmail({
    to: email,
    subject,
    html: wrapBrandedEmail(subject, content),
  });
}

/**
 * Send sale notification email to seller
 */
export async function sendSaleNotificationEmail(
  sellerEmail: string,
  sellerName: string,
  designTitle: string,
  saleAmount: number,
  sellerEarnings: number,
  purchaseType: string
): Promise<boolean> {
  const dashboardUrl = `${BASE_URL}/seller/dashboard`;
  const subject = `💰 You Made a Sale! - ${designTitle}`;
  const content = `
    <h2>🎉 Congratulations on Your Sale!</h2>
    <p>Hello ${sellerName || 'Designer'},</p>
    <p>Great news! Someone just purchased your design.</p>
    
    <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
      <p style="margin: 0;"><strong>Design:</strong> ${designTitle}</p>
      <p style="margin: 10px 0 0;"><strong>Purchase Type:</strong> ${purchaseType}</p>
      <p style="margin: 10px 0 0;"><strong>Sale Amount:</strong> $${saleAmount.toFixed(2)}</p>
      <p style="margin: 10px 0 0; font-size: 18px; color: #10B981;"><strong>Your Earnings:</strong> $${sellerEarnings.toFixed(2)}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" class="cta-btn">View Dashboard</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Keep up the great work! Your earnings will be transferred according to your payout schedule.
    </p>
  `;
  
  return sendEmail({
    to: sellerEmail,
    subject,
    html: wrapBrandedEmail(subject, content),
  });
}

// ============================================
// POD Status Email Templates
// ============================================

interface PODStatusEmailData {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  reason?: string;
  isSeller?: boolean;
}

/**
 * Send POD order status update email
 */
export async function sendPODStatusEmail(data: PODStatusEmailData): Promise<boolean> {
  const { to, customerName, orderNumber, status, trackingNumber, trackingUrl, carrier, reason, isSeller } = data;
  
  const orderUrl = isSeller 
    ? `${BASE_URL}/seller/orders`
    : `${BASE_URL}/profile?tab=orders`;
  
  // Status-specific content
  const statusConfig: Record<string, { emoji: string; title: string; message: string; color: string }> = {
    'shipped': {
      emoji: '🚚',
      title: 'Your Order Has Shipped!',
      message: isSeller 
        ? 'Great news! A POD order containing your design has been shipped to the customer.'
        : 'Great news! Your order is on its way.',
      color: '#3B82F6'
    },
    'in_production': {
      emoji: '🏭',
      title: 'Order In Production',
      message: isSeller
        ? 'A POD order containing your design is now being manufactured.'
        : 'Your custom order is now being produced.',
      color: '#F59E0B'
    },
    'delivered': {
      emoji: '✅',
      title: 'Order Delivered!',
      message: isSeller
        ? 'A POD order containing your design has been successfully delivered!'
        : 'Your order has been delivered successfully!',
      color: '#10B981'
    },
    'canceled': {
      emoji: '❌',
      title: 'Order Canceled',
      message: reason 
        ? `The order has been canceled. Reason: ${reason}`
        : 'The order has been canceled.',
      color: '#EF4444'
    },
    'failed': {
      emoji: '⚠️',
      title: 'Order Issue',
      message: isSeller
        ? `There was an issue with a POD order containing your design. ${reason || 'Our team is looking into it.'}`
        : `There was an issue with your order. ${reason || 'Our team is looking into it.'}`,
      color: '#EF4444'
    },
    'returned': {
      emoji: '📦',
      title: 'Package Returned',
      message: 'The package was returned to the sender. This may require reshipment.',
      color: '#F59E0B'
    },
    'delivery_failed': {
      emoji: '⚠️',
      title: 'Delivery Issue',
      message: 'The delivery attempt was unsuccessful. The carrier may attempt redelivery.',
      color: '#F59E0B'
    }
  };

  const config = statusConfig[status] || {
    emoji: '📦',
    title: 'Order Update',
    message: `Your order status has been updated to: ${status}`,
    color: '#6B7280'
  };

  // Build tracking info HTML
  let trackingHtml = '';
  if (trackingNumber || trackingUrl) {
    trackingHtml = `
      <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0; font-weight: bold;">Tracking Information</p>
        ${carrier ? `<p style="margin: 5px 0 0;">Carrier: ${carrier}</p>` : ''}
        ${trackingNumber ? `<p style="margin: 5px 0 0;">Tracking Number: <code>${trackingNumber}</code></p>` : ''}
        ${trackingUrl ? `
          <p style="margin: 10px 0 0;">
            <a href="${trackingUrl}" style="color: #4F46E5; text-decoration: underline;">Track Your Package →</a>
          </p>
        ` : ''}
      </div>
    `;
  }

  return sendEmail({
    to: to,
    subject: `${config.emoji} ${config.title} - Order #${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${config.color};">${config.emoji} ${config.title}</h2>
        
        <p>Hello ${customerName},</p>
        <p>${config.message}</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${config.color};">
          <p style="margin: 0;"><strong>Order Number:</strong> #${orderNumber}</p>
          <p style="margin: 10px 0 0;"><strong>Status:</strong> ${status.replace(/_/g, ' ').toUpperCase()}</p>
        </div>
        
        ${trackingHtml}
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            ${isSeller ? 'View Your Orders' : 'View Order Details'}
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
          ${isSeller 
            ? 'You\'re receiving this because your design was included in a Print-on-Demand order.'
            : 'If you have any questions about your order, please contact our support team.'
          }
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          ${APP_NAME} - Your Fashion Design Marketplace
        </p>
      </div>
    `,
  });
}

// ============================================
// Admin POD Notification Emails
// ============================================

interface AdminPODAlertData {
  orderNumber: string;
  orderId: string;
  status: string;
  provider: string;
  reason?: string;
  customerEmail?: string;
  totalAmount?: number;
}

/**
 * Send POD alert to admin for critical events (failures, cancellations, issues)
 */
export async function sendAdminPODAlert(data: AdminPODAlertData): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('[Email] ADMIN_EMAIL not configured, skipping admin POD alert');
    return false;
  }

  const alertConfig: Record<string, { emoji: string; title: string; color: string; urgency: string }> = {
    'failed': {
      emoji: '🚨',
      title: 'POD Order Failed',
      color: '#EF4444',
      urgency: 'HIGH'
    },
    'canceled': {
      emoji: '❌',
      title: 'POD Order Canceled',
      color: '#F59E0B',
      urgency: 'MEDIUM'
    },
    'returned': {
      emoji: '📦',
      title: 'POD Package Returned',
      color: '#F59E0B',
      urgency: 'MEDIUM'
    },
    'delivery_failed': {
      emoji: '⚠️',
      title: 'POD Delivery Failed',
      color: '#F59E0B',
      urgency: 'MEDIUM'
    }
  };

  const config = alertConfig[data.status] || {
    emoji: '📋',
    title: 'POD Order Update',
    color: '#6B7280',
    urgency: 'LOW'
  };

  const orderUrl = `${BASE_URL}/admin/pod`;

  return sendEmail({
    to: adminEmail,
    subject: `${config.emoji} [${config.urgency}] ${config.title} - Order #${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${config.color}; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${config.emoji} ${config.title}</h2>
          <p style="margin: 5px 0 0; opacity: 0.9;">Urgency: ${config.urgency}</p>
        </div>
        
        <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <h3 style="margin-top: 0;">Order Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Order Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">#${data.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>POD Provider:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.provider || 'Unknown'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <span style="background: ${config.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                  ${data.status.toUpperCase().replace(/_/g, ' ')}
                </span>
              </td>
            </tr>
            ${data.customerEmail ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Customer:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.customerEmail}</td>
            </tr>
            ` : ''}
            ${data.totalAmount ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Order Total:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">$${data.totalAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
          </table>

          ${data.reason ? `
          <div style="background: #FEF2F2; border-left: 4px solid ${config.color}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <strong>Reason:</strong>
            <p style="margin: 5px 0 0;">${data.reason}</p>
          </div>
          ` : ''}

          <h3>Recommended Actions</h3>
          <ul style="color: #666;">
            ${data.status === 'failed' ? `
              <li>Check the POD provider dashboard for error details</li>
              <li>Contact customer about the issue</li>
              <li>Consider refunding or resubmitting the order</li>
            ` : ''}
            ${data.status === 'canceled' ? `
              <li>Verify if refund has been processed</li>
              <li>Check if customer initiated the cancellation</li>
            ` : ''}
            ${data.status === 'returned' ? `
              <li>Contact customer to verify shipping address</li>
              <li>Arrange for reshipment if needed</li>
            ` : ''}
            ${data.status === 'delivery_failed' ? `
              <li>Contact carrier for delivery attempt details</li>
              <li>Reach out to customer about redelivery</li>
            ` : ''}
          </ul>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View POD Orders Dashboard
            </a>
          </p>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
          This is an automated alert from ${APP_NAME} POD System
        </p>
      </div>
    `,
  });
}

// ============================================
// Warehouse Storage Notification Templates
// ============================================

interface WarehouseMonth5NotificationData {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  daysInWarehouse: number;
  currentStock: number;
  cycleEndDay: number;
  repostsRemaining: number;
}

/**
 * Send Month 5 notification to seller (Day 120+)
 * Alerts seller that their product is entering the final month of the 180-day cycle
 */
export async function sendMonth5WarehouseNotification(
  data: WarehouseMonth5NotificationData
): Promise<boolean> {
  const productUrl = `${BASE_URL}/seller/boutique/${data.productId}`;
  const warehouseUrl = `${BASE_URL}/seller/boutique/warehouse-expiration`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `⏰ Action Needed: ${data.productTitle} Entering Month 5 of Storage`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #F59E0B; margin-top: 0;">⏰ Action Required: Storage Month 5 Alert</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your product <strong>"${data.productTitle}"</strong> has been in our warehouse for <strong>${data.daysInWarehouse} days</strong>. 
            You're now entering the final month (Month 5) of your 180-day storage cycle.
          </p>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400E; font-weight: bold;">⚠️ What This Means:</p>
            <ul style="color: #92400E; margin: 10px 0 0 0; padding-left: 20px;">
              <li>In <strong>${data.cycleEndDay - data.daysInWarehouse} days</strong>, we'll automatically deduct 1 unit of inventory</li>
              <li>You can <strong>repost your product</strong> to reset the 180-day countdown</li>
              <li>Reposting costs 1 unit (we keep it to cover return shipping)</li>
              <li>You have <strong>${data.repostsRemaining}/3 reposts available today</strong></li>
            </ul>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>Your Current Status:</strong><br>
            • Days in Warehouse: <strong>${data.daysInWarehouse}/${data.cycleEndDay}</strong><br>
            • Current Stock: <strong>${data.currentStock} units</strong><br>
            • Status: <strong style="color: #F59E0B;">Month 5 (Final 60 Days)</strong>
          </p>
          
          <div style="margin: 30px 0;">
            <p style="text-align: center;">
              <a href="${warehouseUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
                View Warehouse Dashboard
              </a>
            </p>
          </div>
          
          <h3 style="color: #333; font-size: 15px; margin-top: 20px;">What You Can Do:</h3>
          <ol style="color: #555; font-size: 14px; line-height: 1.8;">
            <li><strong>Repost Your Product</strong> - Keep it selling with 1 unit deducted</li>
            <li><strong>Reduce Price</strong> - Make it more appealing to buyers</li>
            <li><strong>Let It Deduct</strong> - Allow automatic deduction at Day 180</li>
            <li><strong>Monitor Sales</strong> - Check if inventory is moving</li>
          </ol>
          
          <p style="color: #999; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            Questions? Visit your <a href="${warehouseUrl}" style="color: #4F46E5; text-decoration: none;">warehouse dashboard</a> for more details.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 15px; text-align: center;">
            This is an automated notification from ${APP_NAME}
          </p>
        </div>
      </div>
    `,
  });
}

interface WarehouseFinalWarningData {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  daysInWarehouse: number;
  daysUntilDeduction: number;
  currentStock: number;
}

/**
 * Send final warning before stock deduction (Day 173+)
 * Last chance to take action before automatic -1 unit deduction
 */
export async function sendWarehouseFinalWarning(
  data: WarehouseFinalWarningData
): Promise<boolean> {
  const warehouseUrl = `${BASE_URL}/seller/boutique/warehouse-expiration`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `🚨 URGENT: ${data.productTitle} - ${data.daysUntilDeduction} Days Until Stock Deduction`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-top: 4px solid #DC2626;">
          <h2 style="color: #DC2626; margin-top: 0;">🚨 URGENT: Final Warning - Action Required</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; font-weight: bold;">
            Your product <strong>"${data.productTitle}"</strong> will have <strong style="color: #DC2626;">1 unit automatically deducted</strong> in <strong>${data.daysUntilDeduction} day(s)</strong>.
          </p>
          
          <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #7F1D1D; font-weight: bold;">This is your last chance to:</p>
            <ul style="color: #7F1D1D; margin: 10px 0 0 0; padding-left: 20px;">
              <li><strong>Repost your product</strong> to reset the 180-day countdown</li>
              <li>Cancel the automatic deduction</li>
              <li>Keep your product LIVE in our marketplace</li>
            </ul>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>Current Status:</strong><br>
            • Days in Warehouse: <strong>${data.daysInWarehouse}</strong><br>
            • Current Stock: <strong>${data.currentStock} units</strong><br>
            • Days Until Deduction: <strong style="color: #DC2626;">${data.daysUntilDeduction}</strong>
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${warehouseUrl}" style="display: inline-block; padding: 16px 32px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Repost Now - Don't Lose Stock!
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            If you don't repost or take action before Day 180, we'll automatically deduct 1 unit to offset return shipping costs. 
            Your product will remain LIVE, but with reduced inventory.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from ${APP_NAME}
          </p>
        </div>
      </div>
    `,
  });
}

interface WarehouseDeductionConfirmationData {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  daysInWarehouse: number;
  stockDeducted: number;
  remainingStock: number;
}

/**
 * Confirm stock deduction after automatic processing
 * Notifies seller that 1 unit has been deducted per the contract
 */
export async function sendWarehouseDeductionConfirmation(
  data: WarehouseDeductionConfirmationData
): Promise<boolean> {
  const productUrl = `${BASE_URL}/seller/boutique/${data.productId}`;
  const warehouseUrl = `${BASE_URL}/seller/boutique/warehouse-expiration`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `Stock Deduction Processed: ${data.productTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #4B5563; margin-top: 0;">Stock Deduction Processed</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your product <strong>"${data.productTitle}"</strong> has reached the 180-day storage milestone. 
            As per our warehouse agreement, we've automatically deducted <strong>${data.stockDeducted} unit</strong> to offset return shipping costs.
          </p>
          
          <div style="background-color: #E0F2FE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0C4A6E; font-weight: bold;">What Happened:</p>
            <ul style="color: #0C4A6E; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Automatic deduction completed at Day 180 of storage cycle</li>
              <li>1 unit deducted per variant</li>
              <li>Your product remains LIVE and available for sale</li>
              <li>The 180-day countdown has reset for the next cycle</li>
            </ul>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>Transaction Details:</strong><br>
            • Product: <strong>${data.productTitle}</strong><br>
            • Days in Warehouse: <strong>${data.daysInWarehouse}</strong><br>
            • Units Deducted: <strong>${data.stockDeducted}</strong><br>
            • Remaining Stock: <strong>${data.remainingStock}</strong><br>
            • Status: <strong style="color: #059669;">LIVE (Cycle Reset)</strong>
          </p>
          
          ${data.remainingStock <= 1 ? `
            <div style="background-color: #DBEAFE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #0C4A6E; font-weight: bold;">⚠️ Low Stock Alert:</p>
              <p style="color: #0C4A6E; margin: 8px 0 0 0;">
                You have only <strong>${data.remainingStock} unit(s)</strong> remaining. Consider pricing adjustments or marketing to boost sales.
              </p>
            </div>
          ` : ''}
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${warehouseUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Warehouse Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            <strong>What's Next?</strong><br>
            Your product now enters a new 180-day storage cycle. You can repost again in Day 120-179 of this new cycle to prevent further deductions.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from ${APP_NAME}
          </p>
        </div>
      </div>
    `,
  });
}

interface WarehouseProductDelistedData {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  daysInWarehouse: number;
  reason: 'out_of_stock' | 'seller_request';
}

/**
 * Notify seller when product is delisted from warehouse
 */
export async function sendWarehouseProductDelistedNotification(
  data: WarehouseProductDelistedData
): Promise<boolean> {
  const dashboardUrl = `${BASE_URL}/seller/boutique`;

  const reasonText = data.reason === 'out_of_stock'
    ? 'All inventory has been depleted after multiple 180-day cycles and automatic deductions.'
    : 'You requested the product to be removed from the warehouse.';

  return sendEmail({
    to: data.sellerEmail,
    subject: `Product Delisted: ${data.productTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #4B5563; margin-top: 0;">Product Delisted from Warehouse</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your product <strong>"${data.productTitle}"</strong> has been delisted from our warehouse inventory system.
          </p>
          
          <div style="background-color: #F3E8FF; border-left: 4px solid #9333EA; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #581C87; font-weight: bold;">Reason for Delisting:</p>
            <p style="color: #581C87; margin: 8px 0 0 0;">${reasonText}</p>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>Product Details:</strong><br>
            • Product: <strong>${data.productTitle}</strong><br>
            • Days Stored: <strong>${data.daysInWarehouse}</strong><br>
            • Status: <strong style="color: #DC2626;">DELISTED</strong>
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Back to Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            You can reupload this product or create new listings whenever you're ready. 
            Thank you for using ${APP_NAME}!
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from ${APP_NAME}
          </p>
        </div>
      </div>
    `,
  });
}

interface WarehouseReturnApprovedData {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  daysInWarehouse?: number;
  adminFee?: number;
  itemsReturning?: number;
}

export async function sendWarehouseReturnApprovedNotification(
  data: WarehouseReturnApprovedData
): Promise<boolean> {
  const dashboardUrl = `${BASE_URL}/seller/boutique`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `Product Returned from Warehouse: ${data.productTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #4B5563; margin-top: 0;">Product Returned from Warehouse</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your product <strong>"${data.productTitle}"</strong> has been successfully returned from the warehouse and the warehouse lock has been released.
          </p>
          
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #047857; font-weight: bold;">What This Means:</p>
            <p style="color: #047857; margin: 8px 0 0 0;">
              • The -1 inventory lock variant has been deleted<br>
              • Warehouse metadata has been cleared<br>
              • Your product is now independent of the warehouse system<br>
              • You can manage this product normally
            </p>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>Product Details:</strong><br>
            • Product: <strong>${data.productTitle}</strong><br>
            • Product ID: <strong>${data.productId}</strong><br>
            • Status: <strong style="color: #10B981;">RETURNED</strong>
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Your Products
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            If you need to send this product to the warehouse again, you can do so through your dashboard. 
            Thank you for using ${APP_NAME}!
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from ${APP_NAME}
          </p>
        </div>
      </div>
    `,
  });
}

interface WarehouseRepostApprovedData {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  originalStock: number;
  newStock: number;
  stockDeducted: number;
  daysReset: boolean;
}

/**
 * Notify seller when repost request is approved
 */
export async function sendRepostApprovedNotification(
  data: WarehouseRepostApprovedData
): Promise<boolean> {
  const warehouseUrl = `${BASE_URL}/seller/boutique/warehouse-expiration`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `✅ Repost Approved: ${data.productTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-top: 4px solid #059669;">
          <h2 style="color: #059669; margin-top: 0;">✅ Repost Request Approved!</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Great news! Your repost request for <strong>"${data.productTitle}"</strong> has been approved by our admin team.
          </p>
          
          <div style="background-color: #DBEAFE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0C4A6E; font-weight: bold;">✨ What Happened:</p>
            <ul style="color: #0C4A6E; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Your product remains <strong>LIVE</strong> in the marketplace</li>
              <li><strong>${data.stockDeducted} unit(s)</strong> have been deducted (warehouse offset)</li>
              <li>The 180-day countdown has been <strong>reset</strong></li>
              <li>You can repost again in Month 5 of the next cycle</li>
            </ul>
          </div>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>Stock Update:</strong><br>
            • Previous Stock: <strong>${data.originalStock} units</strong><br>
            • New Stock: <strong style="color: #059669;">${data.newStock} units</strong><br>
            • Deducted: <strong>${data.stockDeducted} unit(s)</strong>
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${warehouseUrl}" style="display: inline-block; padding: 14px 28px; background-color: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Warehouse Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            <strong>Next Steps:</strong><br>
            Your product now enters a new 180-day storage cycle. You'll receive a notification at Day 120 if you want to repost again.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from ${APP_NAME}
          </p>
        </div>
      </div>
    `,
  });
}

interface WarehouseRepostRejectedData {
  sellerName: string;
  sellerEmail: string;
  productTitle: string;
  productId: string;
  adminNotes?: string;
}

/**
 * Notify seller when repost request is rejected
 */
export async function sendRepostRejectedNotification(
  data: WarehouseRepostRejectedData
): Promise<boolean> {
  const warehouseUrl = `${BASE_URL}/seller/boutique/warehouse-expiration`;
  const dashboardUrl = `${BASE_URL}/seller/boutique`;

  return sendEmail({
    to: data.sellerEmail,
    subject: `Repost Request Declined: ${data.productTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #4B5563; margin-top: 0;">Repost Request Update</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi <strong>${data.sellerName}</strong>,
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your repost request for <strong>"${data.productTitle}"</strong> has been reviewed and declined at this time.
          </p>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400E; font-weight: bold;">What This Means:</p>
            <ul style="color: #92400E; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Your product stock has been <strong>unlocked</strong> to its original level</li>
              <li>You can submit a new repost request anytime</li>
              <li>Your product remains in the warehouse</li>
            </ul>
          </div>
          
          ${data.adminNotes ? `
            <div style="background-color: #E0F2FE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #0C4A6E; font-weight: bold;">Admin Notes:</p>
              <p style="color: #0C4A6E; margin: 8px 0 0 0;">${data.adminNotes}</p>
            </div>
          ` : ''}
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${warehouseUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
              Try Again
            </a>
            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background-color: #6B7280; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            You can always resubmit your repost request during Month 5 (Days 120-179) of your storage cycle. 
            If you have questions, please contact support.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from ${APP_NAME}
          </p>
        </div>
      </div>
    `,
  });
}


