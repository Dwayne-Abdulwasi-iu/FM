/**
 * Referral/Affiliate System
 * 
 * Features:
 * - User referral codes
 * - Referral tracking
 * - Commission payouts for referrers
 * - Tiered rewards based on referral performance
 */

import prisma from './prisma';
import { createHash } from 'crypto';

// Referral configuration
export const REFERRAL_CONFIG = {
  // Reward for referrer when referee makes first purchase
  referrerRewardPercent: 10, // 10% of first purchase
  referrerRewardMax: 50, // Max $50 per referral
  
  // Discount for new user using referral code
  refereeDiscountPercent: 15, // 15% off first purchase
  refereeDiscountMax: 25, // Max $25 discount
  
  // Tiers based on successful referrals
  tiers: [
    { name: 'Starter', minReferrals: 0, bonusPercent: 0 },
    { name: 'Bronze', minReferrals: 5, bonusPercent: 2 },
    { name: 'Silver', minReferrals: 15, bonusPercent: 5 },
    { name: 'Gold', minReferrals: 30, bonusPercent: 8 },
    { name: 'Platinum', minReferrals: 50, bonusPercent: 10 },
    { name: 'Diamond', minReferrals: 100, bonusPercent: 15 },
  ],
  
  // Cookie duration for tracking (30 days)
  cookieDurationDays: 30,
};

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  currentTier: string;
  nextTier: string | null;
  referralsToNextTier: number;
  bonusPercent: number;
}

interface ReferralUser {
  id: string;
  name: string | null;
  email: string;
  status: string;
  joinedAt: Date;
  firstPurchaseAt: Date | null;
  earningsFromUser: number;
}

/**
 * Generate a unique referral code for a user
 */
export function generateReferralCode(userId: string, name?: string): string {
  // Create a short, memorable code
  const prefix = name 
    ? name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
    : 'REF';
  
  const hash = createHash('md5')
    .update(userId + Date.now())
    .digest('hex')
    .slice(0, 5)
    .toUpperCase();
  
  return `${prefix}${hash}`;
}

/**
 * Get or create referral code for a user
 */
export async function getUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, referralCode: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Return existing code if available
  if (user.referralCode) {
    return user.referralCode;
  }

  // Generate and save new code
  const code = generateReferralCode(userId, user.name || undefined);
  
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
  });

  return code;
}

/**
 * Validate and get referrer by code
 */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string; referrerName?: string }> {
  if (!code || code.length < 6) {
    return { valid: false };
  }

  // Check user's referral code first
  const referrer = await prisma.user.findFirst({
    where: { referralCode: code.toUpperCase() },
    select: { id: true, name: true },
  });

  if (referrer) {
    return {
      valid: true,
      referrerId: referrer.id,
      referrerName: referrer.name || 'A friend',
    };
  }

  // Also check referral table for legacy codes
  const referral = await prisma.referral.findFirst({
    where: { referrerCode: code.toUpperCase() },
    select: { referrerId: true },
  });

  if (referral) {
    const user = await prisma.user.findUnique({
      where: { id: referral.referrerId },
      select: { id: true, name: true },
    });
    
    if (user) {
      return {
        valid: true,
        referrerId: user.id,
        referrerName: user.name || 'A friend',
      };
    }
  }

  return { valid: false };
}

/**
 * Track a new referral when user signs up
 */
export async function trackReferral(referrerId: string, refereeId: string): Promise<void> {
  // Check if referral already exists for this referee
  const existing = await prisma.referral.findFirst({
    where: { referredId: refereeId },
  });

  if (existing) {
    console.log('Referral already tracked for user:', refereeId);
    return;
  }

  // Don't allow self-referral
  if (referrerId === refereeId) {
    console.log('Self-referral attempted:', refereeId);
    return;
  }

  // Get referrer's code
  const referrerCode = await getUserReferralCode(referrerId);

  // Create referral record
  await prisma.referral.create({
    data: {
      referrerId,
      referrerCode,
      referredId: refereeId,
      signupCompleted: true,
    },
  });

  // Update referee's referredBy field
  await prisma.user.update({
    where: { id: refereeId },
    data: { referredBy: referrerId },
  });

  console.log('Referral tracked:', { referrerId, refereeId });
}

/**
 * Process referral reward when referee makes first purchase
 */
export async function processReferralReward(
  refereeId: string,
  purchaseAmount: number
): Promise<{ rewarded: boolean; referrerReward?: number; refereeDiscount?: number }> {
  // Find pending referral for this user
  const referral = await prisma.referral.findFirst({
    where: {
      referredId: refereeId,
      firstPurchaseMade: false,
    },
  });

  if (!referral) {
    return { rewarded: false };
  }

  // Calculate rewards
  const referrerReward = Math.min(
    purchaseAmount * (REFERRAL_CONFIG.referrerRewardPercent / 100),
    REFERRAL_CONFIG.referrerRewardMax
  );

  // Get referrer's tier bonus
  const stats = await getReferralStats(referral.referrerId);
  const tierBonus = referrerReward * (stats.bonusPercent / 100);
  const totalReward = referrerReward + tierBonus;

  // Update referral status
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      firstPurchaseMade: true,
      rewardStatus: 'EARNED',
      referrerReward: totalReward,
      rewardedAt: new Date(),
    },
  });

  // Credit referrer's account
  await prisma.user.update({
    where: { id: referral.referrerId },
    data: {
      referralEarnings: { increment: totalReward },
      totalReferrals: { increment: 1 },
    },
  });

  // Note: Referral earnings are tracked on the User model (referralEarnings field)
  // They can be paid out through the standard seller payout process

  console.log('Referral reward processed:', {
    referrerId: referral.referrerId,
    reward: totalReward,
  });

  return {
    rewarded: true,
    referrerReward: totalReward,
  };
}

/**
 * Calculate discount for referee's first purchase
 */
export async function calculateRefereeDiscount(
  refereeId: string,
  orderAmount: number
): Promise<{ hasDiscount: boolean; discountAmount: number; discountPercent: number }> {
  // Check if user has a pending referral (first purchase)
  const referral = await prisma.referral.findFirst({
    where: {
      referredId: refereeId,
      firstPurchaseMade: false,
    },
  });

  if (!referral) {
    return { hasDiscount: false, discountAmount: 0, discountPercent: 0 };
  }

  const discountAmount = Math.min(
    orderAmount * (REFERRAL_CONFIG.refereeDiscountPercent / 100),
    REFERRAL_CONFIG.refereeDiscountMax
  );

  return {
    hasDiscount: true,
    discountAmount,
    discountPercent: REFERRAL_CONFIG.refereeDiscountPercent,
  };
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: {
      rewardStatus: true,
      referrerReward: true,
      firstPurchaseMade: true,
      signupCompleted: true,
    },
  });

  const totalReferrals = referrals.filter(r => r.signupCompleted).length;
  const successfulReferrals = referrals.filter((r) => r.firstPurchaseMade).length;
  const pendingReferrals = referrals.filter((r) => r.signupCompleted && !r.firstPurchaseMade).length;
  
  const totalEarnings = referrals
    .filter((r) => r.firstPurchaseMade)
    .reduce((sum, r) => sum + (r.referrerReward || 0), 0);
  
  const pendingEarnings = 0; // Could calculate based on pending referrals

  // Determine tier
  let currentTier = REFERRAL_CONFIG.tiers[0];
  let nextTier: typeof currentTier | null = null;

  for (let i = REFERRAL_CONFIG.tiers.length - 1; i >= 0; i--) {
    if (successfulReferrals >= REFERRAL_CONFIG.tiers[i].minReferrals) {
      currentTier = REFERRAL_CONFIG.tiers[i];
      nextTier = REFERRAL_CONFIG.tiers[i + 1] || null;
      break;
    }
  }

  const referralsToNextTier = nextTier
    ? nextTier.minReferrals - successfulReferrals
    : 0;

  return {
    totalReferrals,
    successfulReferrals,
    pendingReferrals,
    totalEarnings,
    pendingEarnings,
    currentTier: currentTier.name,
    nextTier: nextTier?.name || null,
    referralsToNextTier,
    bonusPercent: currentTier.bonusPercent,
  };
}

/**
 * Get list of referred users
 */
export async function getReferredUsers(userId: string): Promise<ReferralUser[]> {
  // Get users who were referred by this user
  const referredUsers = await prisma.user.findMany({
    where: { referredBy: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get referral records for additional info
  const referrals = await prisma.referral.findMany({
    where: { 
      referrerId: userId,
      referredId: { in: referredUsers.map(u => u.id) },
    },
  });

  const referralMap = new Map(referrals.map(r => [r.referredId, r]));

  return referredUsers.map((user) => {
    const referral = referralMap.get(user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
      status: referral?.firstPurchaseMade ? 'COMPLETED' : 'PENDING',
      joinedAt: user.createdAt,
      firstPurchaseAt: referral?.rewardedAt || null,
      earningsFromUser: referral?.referrerReward || 0,
    };
  });
}

/**
 * Get referral leaderboard
 */
export async function getReferralLeaderboard(limit: number = 10) {
  const topReferrers = await prisma.user.findMany({
    where: {
      totalReferrals: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      image: true,
      totalReferrals: true,
      referralEarnings: true,
    },
    orderBy: { totalReferrals: 'desc' },
    take: limit,
  });

  return topReferrers.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    name: user.name || 'Anonymous',
    image: user.image,
    referrals: user.totalReferrals,
    earnings: user.referralEarnings,
    tier: getTierForReferrals(user.totalReferrals),
  }));
}

/**
 * Helper: Get tier name for referral count
 */
function getTierForReferrals(count: number): string {
  for (let i = REFERRAL_CONFIG.tiers.length - 1; i >= 0; i--) {
    if (count >= REFERRAL_CONFIG.tiers[i].minReferrals) {
      return REFERRAL_CONFIG.tiers[i].name;
    }
  }
  return 'Starter';
}

/**
 * Generate shareable referral link
 */
export function generateReferralLink(code: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.com';
  return `${baseUrl}/auth/signup?ref=${code}`;
}

/**
 * Generate social share messages
 */
export function generateShareMessages(code: string, referrerName?: string) {
  const link = generateReferralLink(code);
  const discount = REFERRAL_CONFIG.refereeDiscountPercent;

  return {
    whatsapp: `🎨 Join Fashion Marketplace and get ${discount}% off your first purchase! Use my referral link: ${link}`,
    twitter: `Discover amazing fashion designs on @FashionMarket! Use my link for ${discount}% off: ${link} #FashionDesign #AfricanFashion`,
    facebook: `I've been finding amazing fashion designs on Fashion Marketplace. Join using my link and get ${discount}% off your first purchase! ${link}`,
    email: {
      subject: `${referrerName || 'Your friend'} invited you to Fashion Marketplace!`,
      body: `Hi!\n\n${referrerName || 'Your friend'} thinks you'd love Fashion Marketplace - a platform for discovering unique fashion designs from talented African designers.\n\nUse this link to sign up and get ${discount}% off your first purchase:\n${link}\n\nHappy shopping!`,
    },
    copy: link,
  };
}
