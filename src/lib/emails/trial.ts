import { sendEmail } from '@/lib/email'

interface TrialActivationData {
  email: string
  userName: string
  expiresAt: Date
}

interface TrialExpiringData {
  email: string
  userName: string
  expiresAt: Date
  daysRemaining: number
}

interface TrialExpiredData {
  email: string
  userName: string
  upgradePath?: string
}

/**
 * Send trial activation confirmation email
 */
export async function sendTrialActivationEmail(data: TrialActivationData): Promise<boolean> {
  const { email, userName, expiresAt } = data
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Pro Trial Activated!</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${userName},</p>
        
        <p>Your 30-day Pro subscription trial has been activated! You now have access to premium features:</p>
        
        <ul style="color: #333;">
          <li><strong>6 Featured Listings</strong> - Up from 5 (get more visibility)</li>
          <li><strong>+1 Tier Boost</strong> - Unlock next seller tier benefits instantly</li>
          <li><strong>1% Commission Discount</strong> - Keep more earnings from every sale</li>
          <li><strong>Advanced Analytics</strong> - Track performance in detail</li>
        </ul>
        
        <div style="background: #e3f2fd; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1565c0;"><strong>Trial expires in ${daysLeft} days</strong></p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${expiresAt.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        
        <p>Ready to make the most of your trial? <a href="${process.env.NEXTAUTH_URL}/seller/dashboard" style="color: #667eea; text-decoration: none; font-weight: bold;">Go to your dashboard →</a></p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; margin: 0;">
          Questions? Reply to this email or visit our help center.
        </p>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: email,
      subject: '🎉 Your 30-Day Pro Trial Has Started!',
      html
    })
    return true
  } catch (error) {
    console.error('[sendTrialActivationEmail] Error:', error)
    return false
  }
}

/**
 * Send trial expiring soon warning
 */
export async function sendTrialExpiringWarningEmail(data: TrialExpiringData): Promise<boolean> {
  const { email, userName, expiresAt, daysRemaining } = data

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">⏰ Your Trial Expires Soon</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${userName},</p>
        
        <p>Your 30-day Pro trial expires in just <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>:</p>
        
        <div style="background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400e;"><strong>Expires: ${expiresAt.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}</strong></p>
        </div>
        
        <p style="color: #333; margin-top: 20px;">Don't lose access to premium features:</p>
        <ul style="color: #333;">
          <li>6 Featured Listings</li>
          <li>+1 Tier Boost</li>
          <li>1% Commission Discount</li>
          <li>Advanced Analytics</li>
        </ul>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/seller/upgrade" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Upgrade to Pro</a>
        </div>
        
        <p style="color: #999; font-size: 12px; margin: 30px 0 0 0;">
          After your trial expires, you'll return to standard seller benefits. Questions? Reply to this email.
        </p>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: email,
      subject: `⏰ Your Pro Trial Expires in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`,
      html
    })
    return true
  } catch (error) {
    console.error('[sendTrialExpiringWarningEmail] Error:', error)
    return false
  }
}

/**
 * Send trial expired notification
 */
export async function sendTrialExpiredEmail(data: TrialExpiredData): Promise<boolean> {
  const { email, userName, upgradePath } = data

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Trial Ended</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${userName},</p>
        
        <p>Your 30-day Pro trial has ended. You've been returned to your standard seller benefits.</p>
        
        <div style="background: #fee2e2; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #7f1d1d;"><strong>Your trial has expired</strong></p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">You now have 5 featured listings instead of 6</p>
        </div>
        
        <p style="color: #333; margin-top: 20px;">Want to keep your premium benefits?</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Pro Subscription Plans:</h3>
          <ul style="color: #666; margin: 10px 0;">
            <li><strong>Monthly:</strong> $9.99/month</li>
            <li><strong>Yearly:</strong> $99.99/year (Save 17%)</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${upgradePath || `${process.env.NEXTAUTH_URL}/seller/upgrade`}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Pro Plans</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; margin: 0;">
          You can activate another free trial in the future. Have questions? Reply to this email.
        </p>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: email,
      subject: 'Your Pro Trial Has Ended',
      html
    })
    return true
  } catch (error) {
    console.error('[sendTrialExpiredEmail] Error:', error)
    return false
  }
}

/**
 * Send OTP code for trial activation verification
 */
export async function sendTrialOTPEmail(email: string, userName: string, code: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Verify Your Email</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${userName},</p>
        
        <p>To activate your 30-day Pro trial, please verify your email address using the code below:</p>
        
        <div style="background: white; padding: 30px; text-align: center; margin: 30px 0; border-radius: 4px; border: 2px dashed #667eea;">
          <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Verification Code</p>
          <p style="margin: 0; font-size: 40px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace;">${code}</p>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">This code expires in 10 minutes</p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't request this code, please ignore this email or contact support.
        </p>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: email,
      subject: 'Your Pro Trial Verification Code',
      html
    })
    return true
  } catch (error) {
    console.error('[sendTrialOTPEmail] Error:', error)
    return false
  }
}
