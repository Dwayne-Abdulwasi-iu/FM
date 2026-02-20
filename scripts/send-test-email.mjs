// scripts/send-test-email.mjs
// Test email script for branded warehouse notifications
// Run with: node scripts/send-test-email.mjs

// Load environment first
import 'dotenv/config.js';
import nodemailer from 'nodemailer';

const to = process.env.TEST_EMAIL || 'lytleewayne@gmail.com';
const subject = 'Test: Branded Warehouse Notification';

function wrapBrandedEmail(subject, content) {
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

const content = `
  <h2 style="color: #4F46E5;">Test Email: Branded Warehouse Notification</h2>
  <p>This is a <strong>test</strong> of the new branded warehouse/boutique notification email template.</p>
  <div style="background:#D1FAE5; padding:16px; border-radius:8px; margin:18px 0; border-left: 4px solid #059669; color:#065F46;">
    <strong>✅ If you see:</strong><br>
    • Fashion Marketplace logo at the top<br>
    • This green-bordered content box<br>
    • Purple button below<br>
    <strong>Then branding is working!</strong>
  </div>
  <div style="text-align: center;">
    <a href="https://fashionmarketplace.store" class="cta-btn">Visit Marketplace</a>
  </div>
  <p style="color: #666; font-size: 14px;">This email demonstrates the new branded HTML wrapper for warehouse notifications.</p>
`;

(async () => {
  try {
    // Check SMTP configuration
    const host = process.env.EMAIL_SERVER_HOST;
    const port = parseInt(process.env.EMAIL_SERVER_PORT || '587');
    const user = process.env.EMAIL_SERVER_USER;
    const pass = process.env.EMAIL_SERVER_PASSWORD;

    if (!host || !user || !pass) {
      console.error('❌ SMTP configuration missing. Please set:');
      console.error('  - EMAIL_SERVER_HOST');
      console.error('  - EMAIL_SERVER_PORT');
      console.error('  - EMAIL_SERVER_USER');
      console.error('  - EMAIL_SERVER_PASSWORD');
      process.exit(1);
    }

    console.log(`📧 Sending test email to: ${to}`);
    console.log(`📨 Using SMTP: ${user}@${host}:${port}`);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to,
      subject,
      text: 'This is a test of the new branded warehouse/boutique notification email template.',
      html: wrapBrandedEmail(subject, content),
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📋 Message ID: ${result.messageId}`);
    console.log(`📍 Response: ${result.response}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to send test email:');
    console.error(err.message);
    process.exit(1);
  }
})();
