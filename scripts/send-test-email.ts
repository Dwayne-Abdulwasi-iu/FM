import { sendEmail, wrapBrandedEmail } from '../src/lib/email';

const to = 'lytleewayne@gmail.com';
const subject = 'Test: Branded Warehouse Notification';
const content = `
  <h2 style="color: #4F46E5;">Test Email</h2>
  <p>This is a <strong>test</strong> of the new branded warehouse/boutique notification email template.</p>
  <div style="background:#D1FAE5; padding:16px; border-radius:8px; margin:18px 0; color:#065F46;">If you see the Fashion Marketplace logo and purple button, branding is working!</div>
  <a href='https://fashionmarketplace.store' class='cta-btn'>Visit Marketplace</a>
`;

(async () => {
  try {
    const result = await sendEmail({
      to,
      subject,
      text: 'This is a test of the new branded warehouse/boutique notification email template.',
      html: wrapBrandedEmail(subject, content),
    });
    console.log('Test email sent:', result);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send test email:', err);
    process.exit(1);
  }
})();
