import prisma from '@/lib/prisma';

/**
 * Generate a unique referral code
 */
export async function generateReferralCode(email: string): Promise<string> {
  // Format: first 3 chars of email + 4 random alphanumeric
  const prefix = email.substring(0, 3).toUpperCase();
  
  // Generate and ensure uniqueness
  let code: string;
  let attempts = 0;
  
  do {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `${prefix}${random}`;
    attempts++;
    
    // Check if code already exists
    const existing = await prisma.comingSoonEmail.findFirst({
      where: { referralCode: code },
      select: { referralCode: true },
    });
    
    if (!existing) break; // Code is unique, use it
    
    if (attempts > 10) {
      throw new Error('Failed to generate unique referral code after 10 attempts');
    }
  } while (true);
  
  return code;
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  if (!code || code.length !== 7) return false;
  return /^[A-Z0-9]{7}$/.test(code);
}

/**
 * Generate shareable referral URL
 */
export function getReferralUrl(referralCode: string): string {
  const domain = process.env.NEXT_PUBLIC_BASE_URL || 'https://fashionmarketplace.store';
  return `${domain}/coming-soon?ref=${referralCode}`;
}
