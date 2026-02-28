import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Send email via SendGrid
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = process.env.EMAIL_FROM || 'noreply@fashionmarketplace.com',
}: EmailParams) {
  try {
    if (!sendgridApiKey) {
      return false;
    }

    await sgMail.send({
      to,
      from,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text
    });

    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}

/**
 * Send coming-soon subscription confirmation email
 */
export async function sendComingSoonConfirmation(
  email: string,
  firstName?: string
) {
  const name = firstName || 'Fashion Enthusiast';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're On The List! 🎉</h1>
          </div>
          
          <div class="content">
            <p>Hi ${name},</p>
            
            <p>Thank you for signing up! 👏 We're thrilled to have you on our waiting list for the most exclusive fashion marketplace.</p>
            
            <p>Here's what's coming:</p>
            <ul>
              <li><strong>🎨 Showcase Your Designs</strong> - Display your fashion illustrations to a global audience</li>
              <li><strong>💼 Monetize Your Talent</strong> - Earn from commissions and exclusive sales</li>
              <li><strong>🌍 Connect Globally</strong> - Join a thriving community of fashion creatives</li>
            </ul>
            
            <p>We'll send you exclusive updates, early-access features, and special launch bonuses before we go live.</p>
            
            <p style="text-align: center;">
              <a href="https://fashionmarketplace.store/coming-soon" class="button">
                Follow Our Journey
              </a>
            </p>
            
            <p>Stay creative,<br>
            The Fashion Marketplace Team</p>
          </div>
          
          <div class="footer">
            <p>You received this email because you subscribed at fashionmarketplace.store/coming-soon</p>
            <p>To unsubscribe, simply reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🎉 Welcome to Fashion Marketplace! You\'re On Our VIP List',
    html,
  });
}

/**
 * Send launch notification email
 */
export async function sendLaunchNotification(
  email: string,
  firstName?: string
) {
  const name = firstName || 'Fashion Enthusiast';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>We're Live! 🚀</h1>
          </div>
          
          <div class="content">
            <p>Hi ${name},</p>
            
            <p>The wait is over! Fashion Marketplace is now live and ready for you. 🎊</p>
            
            <p>As one of our earliest supporters, you get:</p>
            <ul>
              <li>✨ Exclusive VIP badge on your profile</li>
              <li>💝 First-month commission boost (10% extra)</li>
              <li>🎯 Priority support from our team</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="https://fashionmarketplace.store" class="button">
                Start Creating Now
              </a>
            </p>
            
            <p>We can't wait to see your work!<br>
            The Fashion Marketplace Team</p>
          </div>
          
          <div class="footer">
            <p>You received this email because you signed up on our waitlist.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🚀 Fashion Marketplace is Now Live! Your VIP Perks Await',
    html,
  });
}

/**
 * Send coming-soon update/digest email
 */
export async function sendComingSoonDigest(
  email: string,
  firstName?: string,
  updateTitle: string = 'Fashion Marketplace Update',
  updateContent: string = 'We\'re getting closer to launch!',
  daysUntilLaunch?: number
) {
  const name = firstName || 'Fashion Enthusiast';
  const launchMessage = daysUntilLaunch 
    ? `${daysUntilLaunch} days until launch!`
    : 'Coming very soon!';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
          .countdown { text-align: center; color: #ec4899; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${updateTitle}</h1>
          </div>
          
          <div class="content">
            <p>Hi ${name},</p>
            
            <p>${updateContent}</p>
            
            <div class="countdown">
              ⏰ ${launchMessage}
            </div>
            
            <p>As an early subscriber, you'll get:</p>
            <ul>
              <li>✨ Exclusive VIP badge on your profile</li>
              <li>💝 First-month commission boost (10% extra)</li>
              <li>🎯 Priority support from our team</li>
              <li>📢 FirstAccess to new features</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="https://fashionmarketplace.store/coming-soon" class="button">
                Stay Updated
              </a>
            </p>
            
            <p>Excited to see what you'll create!<br>
            The Fashion Marketplace Team</p>
          </div>
          
          <div class="footer">
            <p>You received this email because you subscribed at fashionmarketplace.store/coming-soon</p>
            <p>To unsubscribe, reply to this email with "UNSUBSCRIBE".</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `📬 ${updateTitle}`,
    html,
  });
}

/**
 * Send drip email sequence (Day 1, 7, 30 before launch)
 */
export async function sendDripEmail1Welcome(email: string, firstName?: string) {
  const _name = firstName || 'Fashion Enthusiast';
  return sendComingSoonConfirmation(email, firstName);
}

export async function sendDripEmail7Days(email: string, firstName?: string, daysUntilLaunch: number = 7) {
  const name = firstName || 'Fashion Enthusiast';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .teaser { background: #fff; border-left: 4px solid #ec4899; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Something Magic is Coming ✨</h1>
          </div>
          
          <div class="content">
            <p>Hey ${name},</p>
            
            <p>We're down to <strong>${daysUntilLaunch} days</strong> until Fashion Marketplace changes everything.</p>
            
            <div class="teaser">
              <p><strong>What are designers saying?</strong></p>
              <p><em>"Finally, a platform that respects our work and earnings." — Anonymous Designer</em></p>
            </div>
            
            <p>We can't reveal everything yet, but what you're about to see has been carefully designed by creators, for creators.</p>
            
            <p><strong>Get ready for:</strong></p>
            <ul>
              <li>A completely new way to monetize your talent</li>
              <li>Unprecedented commission rates</li>
              <li>A global community of fashion professionals</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="https://fashionmarketplace.store/coming-soon" class="button">
                Share with a Designer Friend
              </a>
            </p>
            
            <p>See you soon,<br>
            The Fashion Marketplace Team</p>
          </div>
          
          <div class="footer">
            <p>You're receiving this because you signed up on our waitlist.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `⏰ ${daysUntilLaunch} Days Until Launch`,
    html,
  });
}

export async function sendDripEmail48Hours(email: string, firstName?: string) {
  const name = firstName || 'Fashion Enthusiast';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .countdown { background: #fff; border: 2px solid #ec4899; padding: 20px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; font-size: 16px; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 48 HOURS AWAY</h1>
            <p>The wait is almost over!</p>
          </div>
          
          <div class="content">
            <p>Hi ${name},</p>
            
            <div class="countdown">
              <p style="font-size: 28px; margin: 0; color: #ec4899;">⏳ LESS THAN 2 DAYS ⏳</p>
              <p style="margin-top: 10px; color: #666;">Set a reminder so you don't miss it</p>
            </div>
            
            <p>In <strong>48 hours</strong>, you'll be able to:</p>
            <ul>
              <li>✨ Create your designer profile</li>
              <li>💼 Display your portfolio</li>
              <li>🎯 Start earning immediately</li>
              <li>👥 Connect with a global creative community</li>
            </ul>
            
            <p style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
              <strong>📌 Pro Tip:</strong> As an early subscriber, you're eligible for exclusive VIP perks when we launch. Don't miss your exclusive benefits!
            </p>
            
            <p style="text-align: center;">
              <a href="https://fashionmarketplace.store/coming-soon" class="button">
                Set Your Reminder
              </a>
            </p>
            
            <p>See you in 48 hours! This is going to be huge! 🎉<br>
            The Fashion Marketplace Team</p>
          </div>
          
          <div class="footer">
            <p>You're receiving this because you signed up on our waitlist.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🚀 48 Hours Until Fashion Marketplace Launches!`,
    html,
  });
}


