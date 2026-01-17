/**
 * Seller Onboarding Email Sequence
 * 
 * A 7-day automated email sequence to help new sellers succeed on DesignDrop.
 * 
 * Day 0: Welcome email (sent immediately on seller signup)
 * Day 1: Profile optimization tips
 * Day 2: First design upload guide
 * Day 3: Pricing strategies
 * Day 5: Promotion & social sharing tips
 * Day 7: Commission tiers & growth
 */

import { sendEmail } from './email'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const APP_NAME = 'DesignDrop'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@designdrop.io'

interface SellerEmailData {
  sellerName: string
  sellerEmail: string
  sellerId: string
}

// Common email styles
const EMAIL_STYLES = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #6366f1; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .content { padding: 30px 0; }
    .cta-button { display: inline-block; background: linear-gradient(to right, #6366f1, #4f46e5); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .tip-box { background: #f3f4f6; border-left: 4px solid #6366f1; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
    .step { display: flex; align-items: flex-start; margin: 15px 0; }
    .step-number { background: #6366f1; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0; }
    .footer { text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    .unsubscribe { color: #9ca3af; font-size: 12px; margin-top: 20px; }
    h1, h2 { color: #1f2937; }
    p { color: #4b5563; line-height: 1.6; }
    .highlight { color: #6366f1; font-weight: 600; }
    .emoji { font-size: 24px; }
  </style>
`

function wrapEmail(content: string, preheader: string = ''): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${EMAIL_STYLES}
    </head>
    <body>
      <!-- Preheader text -->
      <div style="display:none;max-height:0;overflow:hidden;">
        ${preheader}
      </div>
      <div class="container">
        <div class="header">
          <div class="logo">🎨 ${APP_NAME}</div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Happy selling!</p>
          <p>The ${APP_NAME} Team</p>
          <p class="unsubscribe">
            <a href="${BASE_URL}/profile/settings?tab=notifications">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Day 0: Welcome Email (Immediate)
 */
export async function sendSellerWelcomeEmail(data: SellerEmailData): Promise<boolean> {
  const content = `
    <h1>Welcome to ${APP_NAME}, ${data.sellerName}! 🎉</h1>
    
    <p>You've just joined a global community of fashion illustrators selling their work to buyers worldwide. We're thrilled to have you!</p>
    
    <div class="tip-box">
      <strong>Quick Stats:</strong> Our top sellers earn $1,000+ monthly, and our commission rates are the lowest in the industry — starting at just 0.1%!
    </div>
    
    <h2>What's Next?</h2>
    
    <div class="step">
      <div class="step-number">1</div>
      <div>
        <strong>Complete Your Profile</strong>
        <p>Add a bio and profile photo to build trust with buyers.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">2</div>
      <div>
        <strong>Upload Your First Design</strong>
        <p>Start earning by uploading your fashion illustrations.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">3</div>
      <div>
        <strong>Set Up Payments</strong>
        <p>Connect your payment method to receive earnings.</p>
      </div>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${BASE_URL}/seller/dashboard" class="cta-button">Go to Seller Dashboard →</a>
    </p>
    
    <p>Over the next week, we'll send you tips to help you succeed. Questions? Reply to this email — we're here to help!</p>
  `
  
  return sendEmail({
    to: data.sellerEmail,
    subject: `🎨 Welcome to ${APP_NAME}, ${data.sellerName}!`,
    html: wrapEmail(content, 'Start selling your fashion designs to buyers worldwide'),
  })
}

/**
 * Day 1: Profile Optimization
 */
export async function sendProfileOptimizationEmail(data: SellerEmailData): Promise<boolean> {
  const content = `
    <h1>Make Your Profile Stand Out 💎</h1>
    
    <p>Hi ${data.sellerName},</p>
    
    <p>Did you know that sellers with complete profiles get <span class="highlight">3x more views</span> than those without? Here's how to optimize yours:</p>
    
    <div class="tip-box">
      <strong>🎯 Profile Checklist:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>✅ Professional profile photo</li>
        <li>✅ Compelling bio (150+ words)</li>
        <li>✅ Social media links</li>
        <li>✅ Portfolio highlights</li>
        <li>✅ Commission availability status</li>
      </ul>
    </div>
    
    <h2>Pro Tips for Your Bio</h2>
    
    <p><strong>Include:</strong></p>
    <ul>
      <li>Your design style and specialties</li>
      <li>Years of experience</li>
      <li>Notable clients or projects</li>
      <li>What makes your work unique</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${BASE_URL}/profile/edit" class="cta-button">Complete Your Profile →</a>
    </p>
    
    <p>A strong profile builds trust and encourages buyers to choose your designs!</p>
  `
  
  return sendEmail({
    to: data.sellerEmail,
    subject: `💎 Day 1: Make Your Profile Irresistible`,
    html: wrapEmail(content, 'Complete profiles get 3x more views'),
  })
}

/**
 * Day 2: First Upload Guide
 */
export async function sendFirstUploadGuideEmail(data: SellerEmailData): Promise<boolean> {
  const content = `
    <h1>Your First Upload Success Guide 🚀</h1>
    
    <p>Hi ${data.sellerName},</p>
    
    <p>Ready to upload your first design? Here's everything you need to know to make it a hit:</p>
    
    <h2>📸 Image Requirements</h2>
    <div class="tip-box">
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Resolution:</strong> Minimum 1500×1500px (higher is better)</li>
        <li><strong>Format:</strong> PNG or high-quality JPEG</li>
        <li><strong>Multiple angles:</strong> Show details with 2-4 images</li>
        <li><strong>Video:</strong> Add a walkthrough for premium appeal</li>
      </ul>
    </div>
    
    <h2>✍️ Title & Description Tips</h2>
    <p>Great titles include:</p>
    <ul>
      <li>Style name (e.g., "Streetwear", "Haute Couture")</li>
      <li>Key features (e.g., "Floral Print", "Geometric")</li>
      <li>Occasion or use (e.g., "Summer Collection", "Runway")</li>
    </ul>
    
    <h2>🏷️ Category & Tags</h2>
    <p>Use specific, searchable tags. Example tags:</p>
    <p><code style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px;">streetwear, urban fashion, sneaker design, athleisure, 2024 trends</code></p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${BASE_URL}/upload" class="cta-button">Upload Your First Design →</a>
    </p>
    
    <p>Pro tip: Upload 5+ designs to increase your visibility in search results!</p>
  `
  
  return sendEmail({
    to: data.sellerEmail,
    subject: `🚀 Day 2: How to Upload Your First Bestseller`,
    html: wrapEmail(content, 'Everything you need for a successful first upload'),
  })
}

/**
 * Day 3: Pricing Strategies
 */
export async function sendPricingStrategyEmail(data: SellerEmailData): Promise<boolean> {
  const content = `
    <h1>Pricing Your Designs for Success 💰</h1>
    
    <p>Hi ${data.sellerName},</p>
    
    <p>Pricing can make or break your sales. Here's how top sellers price their work:</p>
    
    <h2>📊 Market Research</h2>
    <div class="tip-box">
      <strong>Average prices by category:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Quick sketches: $5 - $15</li>
        <li>Detailed illustrations: $15 - $50</li>
        <li>Full collection pieces: $50 - $150</li>
        <li>Premium/exclusive designs: $150+</li>
      </ul>
    </div>
    
    <h2>💡 Pricing Strategies</h2>
    
    <p><strong>1. Competitive Entry</strong><br>
    Start 10-20% below similar designs to build reviews, then increase.</p>
    
    <p><strong>2. Value-Based</strong><br>
    Price based on complexity, uniqueness, and time invested.</p>
    
    <p><strong>3. Tiered Pricing</strong><br>
    Offer free preview media, premium full files.</p>
    
    <h2>🎁 Pro Tip: Limited-Time Offers</h2>
    <p>Create urgency with promotional pricing for new releases. Our top sellers often launch at 25% off for the first week!</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${BASE_URL}/seller/designs" class="cta-button">Review Your Pricing →</a>
    </p>
    
    <p>Remember: You can always adjust prices based on performance!</p>
  `
  
  return sendEmail({
    to: data.sellerEmail,
    subject: `💰 Day 3: Price Your Designs Like a Pro`,
    html: wrapEmail(content, 'Pricing strategies from top sellers'),
  })
}

/**
 * Day 5: Promotion & Social Sharing
 */
export async function sendPromotionTipsEmail(data: SellerEmailData): Promise<boolean> {
  const content = `
    <h1>Promote Your Designs Like a Pro 📣</h1>
    
    <p>Hi ${data.sellerName},</p>
    
    <p>Great designs deserve to be seen! Here's how to get more eyes on your work:</p>
    
    <h2>📱 Social Media Power</h2>
    <div class="tip-box">
      <strong>Best platforms for fashion designs:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li><strong>Instagram:</strong> Visual showcase, Stories, Reels</li>
        <li><strong>Pinterest:</strong> Long-term discovery, boards</li>
        <li><strong>TikTok:</strong> Process videos, before/after</li>
        <li><strong>Twitter/X:</strong> Industry connections, trends</li>
      </ul>
    </div>
    
    <h2>✨ Content Ideas That Work</h2>
    <ul>
      <li>🎬 Time-lapse of your design process</li>
      <li>📸 Before/after comparisons</li>
      <li>💡 Behind-the-scenes of inspiration</li>
      <li>🗣️ Share customer testimonials</li>
      <li>📊 Trend predictions and analysis</li>
    </ul>
    
    <h2>🔗 Share Button Magic</h2>
    <p>Every design page has a share button! Use it to create deep links that track where your traffic comes from.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${BASE_URL}/seller/designs" class="cta-button">Share Your Designs →</a>
    </p>
    
    <p>Consistency is key — aim to post 3-5 times per week!</p>
  `
  
  return sendEmail({
    to: data.sellerEmail,
    subject: `📣 Day 5: How Top Sellers Promote Their Work`,
    html: wrapEmail(content, 'Social media strategies for fashion designers'),
  })
}

/**
 * Day 7: Commission Tiers & Growth
 */
export async function sendCommissionTiersEmail(data: SellerEmailData): Promise<boolean> {
  const content = `
    <h1>Grow Your Earnings with Tiered Commissions 📈</h1>
    
    <p>Hi ${data.sellerName},</p>
    
    <p>One week in! Here's how to maximize your earnings as you grow:</p>
    
    <h2>💎 Our Commission Tiers</h2>
    <div class="tip-box" style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #d1d5db;">
          <td style="padding: 8px 0;"><strong>Starter (0-10 sales)</strong></td>
          <td style="text-align: right; color: #059669;"><strong>0.1% fee</strong></td>
        </tr>
        <tr style="border-bottom: 1px solid #d1d5db;">
          <td style="padding: 8px 0;"><strong>Bronze (11-50 sales)</strong></td>
          <td style="text-align: right; color: #059669;"><strong>1% fee</strong></td>
        </tr>
        <tr style="border-bottom: 1px solid #d1d5db;">
          <td style="padding: 8px 0;"><strong>Silver (51-200 sales)</strong></td>
          <td style="text-align: right; color: #059669;"><strong>3% fee</strong></td>
        </tr>
        <tr style="border-bottom: 1px solid #d1d5db;">
          <td style="padding: 8px 0;"><strong>Gold (201-500 sales)</strong></td>
          <td style="text-align: right; color: #059669;"><strong>5% fee</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Diamond (500+ sales)</strong></td>
          <td style="text-align: right; color: #059669;"><strong>7% fee</strong></td>
        </tr>
      </table>
    </div>
    
    <h2>🚀 Growth Milestones</h2>
    <p>Unlock perks as you grow:</p>
    <ul>
      <li>✨ <strong>10 sales:</strong> Featured seller badge</li>
      <li>✨ <strong>50 sales:</strong> Priority support</li>
      <li>✨ <strong>200 sales:</strong> Homepage feature eligibility</li>
      <li>✨ <strong>500 sales:</strong> Diamond status + exclusive opportunities</li>
    </ul>
    
    <h2>💡 Quick Wins to Get Your First 10 Sales</h2>
    <ul>
      <li>Share your designs on social media daily</li>
      <li>Offer competitive pricing to build reviews</li>
      <li>Upload at least 5 designs</li>
      <li>Enable commission requests for custom work</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${BASE_URL}/commissions" class="cta-button">View Commission Details →</a>
    </p>
    
    <p>Questions? Reach out anytime at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    
    <p>We're excited to see your journey! 🎨</p>
  `
  
  return sendEmail({
    to: data.sellerEmail,
    subject: `📈 Day 7: Your Path to Diamond Seller Status`,
    html: wrapEmail(content, 'Unlock lower fees as you grow'),
  })
}

/**
 * Send seller onboarding sequence based on days since signup
 */
export async function sendSellerOnboardingEmail(
  data: SellerEmailData, 
  daysSinceSignup: number
): Promise<boolean> {
  switch (daysSinceSignup) {
    case 0:
      return sendSellerWelcomeEmail(data)
    case 1:
      return sendProfileOptimizationEmail(data)
    case 2:
      return sendFirstUploadGuideEmail(data)
    case 3:
      return sendPricingStrategyEmail(data)
    case 5:
      return sendPromotionTipsEmail(data)
    case 7:
      return sendCommissionTiersEmail(data)
    default:
      return false
  }
}

/**
 * Schedule all onboarding emails for a new seller
 * This function should be called when a user becomes a seller
 */
export async function scheduleSellerOnboarding(data: SellerEmailData): Promise<void> {
  // Send welcome email immediately
  await sendSellerWelcomeEmail(data)
  
  // Log that onboarding was initiated
  console.log(`[Seller Onboarding] Initiated for ${data.sellerEmail}`)
  
  // Note: In production, you would use a job queue (BullMQ) to schedule these emails
  // For now, the cron job will handle sending based on signup date
}
