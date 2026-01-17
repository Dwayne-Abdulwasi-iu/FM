/**
 * SMS Service for Phone OTP Verification
 * 
 * Smart Regional Routing:
 * - Africa (primary market): Termii - cheaper, local support, DND bypass
 * - Rest of World: Twilio - best global coverage
 * 
 * Environment Variables:
 * - For Termii (Africa): TERMII_API_KEY, TERMII_SENDER_ID
 * - For Twilio (Global): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * - SMS_PROVIDER: 'auto' (default - smart routing) | 'termii' | 'twilio' | 'console'
 */

export type SMSProvider = 'termii' | 'africas_talking' | 'twilio' | 'console' | 'auto'

interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  provider?: string
}

// African country codes for smart routing
const AFRICAN_COUNTRY_CODES = [
  '234', // Nigeria
  '254', // Kenya
  '233', // Ghana
  '27',  // South Africa
  '255', // Tanzania
  '256', // Uganda
  '251', // Ethiopia
  '20',  // Egypt
  '212', // Morocco
  '213', // Algeria
  '216', // Tunisia
  '237', // Cameroon
  '225', // Côte d'Ivoire
  '221', // Senegal
  '263', // Zimbabwe
  '260', // Zambia
  '265', // Malawi
  '250', // Rwanda
  '267', // Botswana
  '264', // Namibia
  '258', // Mozambique
  '229', // Benin
  '228', // Togo
  '226', // Burkina Faso
  '227', // Niger
  '223', // Mali
  '224', // Guinea
  '232', // Sierra Leone
  '231', // Liberia
  '241', // Gabon
  '242', // Congo
  '243', // DR Congo
  '244', // Angola
  '249', // Sudan
  '211', // South Sudan
  '252', // Somalia
  '253', // Djibouti
  '291', // Eritrea
  '230', // Mauritius
  '262', // Réunion
  '261', // Madagascar
  '268', // Eswatini
  '266', // Lesotho
  '269', // Comoros
  '235', // Chad
  '236', // Central African Republic
  '240', // Equatorial Guinea
  '239', // São Tomé and Príncipe
  '238', // Cape Verde
  '220', // Gambia
  '245', // Guinea-Bissau
  '222', // Mauritania
]

/**
 * Determine if a phone number is African based on country code
 */
function isAfricanNumber(phone: string): boolean {
  // Remove + and any spaces
  const cleaned = phone.replace(/^\+/, '').replace(/\s/g, '')
  
  return AFRICAN_COUNTRY_CODES.some(code => cleaned.startsWith(code))
}

/**
 * Get the best provider for a phone number
 */
function getBestProvider(phone: string): 'termii' | 'twilio' {
  // Use Termii for Africa (cheaper, better local delivery)
  if (isAfricanNumber(phone)) {
    // Only if Termii is configured
    if (process.env.TERMII_API_KEY) {
      return 'termii'
    }
  }
  
  // Fall back to Twilio for global
  return 'twilio'
}

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Get OTP expiry time (10 minutes from now)
 */
export function getOTPExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000)
}

/**
 * Send SMS via configured provider with smart routing
 */
export async function sendSMS(phone: string, message: string): Promise<SMSResult> {
  const providerSetting = (process.env.SMS_PROVIDER || 'auto') as SMSProvider

  // Smart routing: auto-select best provider based on phone region
  let provider: SMSProvider = providerSetting
  if (providerSetting === 'auto') {
    provider = getBestProvider(phone)
  }

  let result: SMSResult

  switch (provider) {
    case 'termii':
      result = await sendViaTermii(phone, message)
      result.provider = 'termii'
      return result
    case 'africas_talking':
      result = await sendViaAfricasTalking(phone, message)
      result.provider = 'africas_talking'
      return result
    case 'twilio':
      result = await sendViaTwilio(phone, message)
      result.provider = 'twilio'
      return result
    case 'console':
    default:
      // Development mode - log to console
      const selectedProvider = providerSetting === 'auto' ? getBestProvider(phone) : 'console'
      console.log(`📱 [SMS to ${phone}] (would use: ${selectedProvider}): ${message}`)
      return { success: true, messageId: 'console-' + Date.now(), provider: 'console' }
  }
}

/**
 * Send OTP to phone number
 */
export async function sendOTP(phone: string, otp: string): Promise<SMSResult> {
  const message = `Your Fashion Marketplace verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`
  return sendSMS(phone, message)
}

/**
 * Send OTP with automatic fallback
 * If primary provider fails, tries the alternative
 */
export async function sendOTPWithFallback(phone: string, otp: string): Promise<SMSResult> {
  const message = `Your Fashion Marketplace verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`
  
  const isAfrican = isAfricanNumber(phone)
  const primaryProvider = isAfrican ? 'termii' : 'twilio'
  const fallbackProvider = isAfrican ? 'twilio' : 'termii'
  
  // Try primary provider
  let result: SMSResult
  if (primaryProvider === 'termii' && process.env.TERMII_API_KEY) {
    result = await sendViaTermii(phone, message)
    if (result.success) {
      result.provider = 'termii'
      return result
    }
    console.warn(`Termii failed for ${phone}, trying Twilio fallback...`)
  } else if (primaryProvider === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
    result = await sendViaTwilio(phone, message)
    if (result.success) {
      result.provider = 'twilio'
      return result
    }
    console.warn(`Twilio failed for ${phone}, trying Termii fallback...`)
  }
  
  // Try fallback provider
  if (fallbackProvider === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
    result = await sendViaTwilio(phone, message)
    result.provider = 'twilio (fallback)'
    return result
  } else if (fallbackProvider === 'termii' && process.env.TERMII_API_KEY) {
    result = await sendViaTermii(phone, message)
    result.provider = 'termii (fallback)'
    return result
  }
  
  return { success: false, error: 'No SMS provider configured' }
}

/**
 * Termii SMS Provider (Primary for Africa)
 * Docs: https://developers.termii.com/
 */
async function sendViaTermii(phone: string, message: string): Promise<SMSResult> {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID || 'FashionMkt'

  if (!apiKey) {
    console.error('TERMII_API_KEY not configured')
    return { success: false, error: 'Termii not configured' }
  }

  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic', // or 'dnd' for DND numbers, 'whatsapp' for WhatsApp
        api_key: apiKey,
      }),
    })

    const data = await response.json()

    if (data.code === 'ok' || response.ok) {
      return { success: true, messageId: data.message_id }
    } else {
      console.error('Termii error:', data)
      return { success: false, error: data.message || 'Failed to send SMS' }
    }
  } catch (error) {
    console.error('Termii request failed:', error)
    return { success: false, error: 'SMS service unavailable' }
  }
}

/**
 * Africa's Talking SMS Provider
 * Docs: https://developers.africastalking.com/
 */
async function sendViaAfricasTalking(phone: string, message: string): Promise<SMSResult> {
  const apiKey = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME
  const senderId = process.env.AT_SENDER_ID

  if (!apiKey || !username) {
    console.error('AT_API_KEY or AT_USERNAME not configured')
    return { success: false, error: 'SMS provider not configured' }
  }

  try {
    const params = new URLSearchParams({
      username,
      to: phone,
      message,
      ...(senderId && { from: senderId }),
    })

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey,
      },
      body: params.toString(),
    })

    const data = await response.json()

    if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      return { success: true, messageId: data.SMSMessageData.Recipients[0].messageId }
    } else {
      console.error('Africa\'s Talking error:', data)
      return { success: false, error: data.SMSMessageData?.Message || 'Failed to send SMS' }
    }
  } catch (error) {
    console.error('Africa\'s Talking request failed:', error)
    return { success: false, error: 'SMS service unavailable' }
  }
}

/**
 * Twilio SMS Provider
 * Docs: https://www.twilio.com/docs/sms
 */
async function sendViaTwilio(phone: string, message: string): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio credentials not configured')
    return { success: false, error: 'SMS provider not configured' }
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: message,
        }).toString(),
      }
    )

    const data = await response.json()

    if (data.sid) {
      return { success: true, messageId: data.sid }
    } else {
      console.error('Twilio error:', data)
      return { success: false, error: data.message || 'Failed to send SMS' }
    }
  } catch (error) {
    console.error('Twilio request failed:', error)
    return { success: false, error: 'SMS service unavailable' }
  }
}

/**
 * Validate phone number format
 * Accepts Nigerian numbers (+234...) and other international formats
 */
export function validatePhoneNumber(phone: string): { valid: boolean; normalized: string; error?: string } {
  // Remove all spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '')

  // Handle Nigerian local format (0803... -> +234803...)
  if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = '+234' + normalized.slice(1)
  }

  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }

  // Basic validation: + followed by 7-15 digits
  const phoneRegex = /^\+[1-9]\d{6,14}$/
  if (!phoneRegex.test(normalized)) {
    return { 
      valid: false, 
      normalized, 
      error: 'Invalid phone number. Include country code (e.g., +234 for Nigeria)' 
    }
  }

  return { valid: true, normalized }
}
