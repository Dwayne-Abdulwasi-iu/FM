'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { REFERRAL_CONFIG } from '@/lib/referral-service';

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  currentTier: string;
  nextTier: string | null;
  referralsToNextTier: number;
  bonusPercent: number;
}

interface ShareMessages {
  whatsapp: string;
  twitter: string;
  facebook: string;
  email: { subject: string; body: string };
  copy: string;
}

export default function ReferralCard() {
  const { data: session } = useSession();
  const { t, formatCurrency } = useLanguage();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [shareMessages, setShareMessages] = useState<ShareMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchReferralData();
    }
  }, [session]);

  const fetchReferralData = async () => {
    try {
      const response = await fetch('/api/referrals');
      if (response.ok) {
        const data = await response.json();
        setReferralCode(data.code);
        setStats(data.stats);
        setShareMessages(data.shareMessages);
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (shareMessages?.copy) {
      await navigator.clipboard.writeText(shareMessages.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOn = (platform: 'whatsapp' | 'twitter' | 'facebook' | 'email') => {
    if (!shareMessages) return;

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareMessages.whatsapp)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages.twitter)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareMessages.facebook)}`,
      email: `mailto:?subject=${encodeURIComponent(shareMessages.email.subject)}&body=${encodeURIComponent(shareMessages.email.body)}`,
    };

    window.open(urls[platform], '_blank');
  };

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    Starter: 'bg-gray-100 text-gray-700',
    Bronze: 'bg-amber-100 text-amber-700',
    Silver: 'bg-gray-200 text-gray-700',
    Gold: 'bg-yellow-100 text-yellow-700',
    Platinum: 'bg-purple-100 text-purple-700',
    Diamond: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold">{t('referral.inviteFriends')}</h2>
        </div>
        <p className="text-purple-100 text-sm">
          {t('profile.shareReferral', { percent: REFERRAL_CONFIG.referrerRewardPercent })}
        </p>
      </div>

      {/* Referral Code Box */}
      <div className="bg-white p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 mb-1">
            {t('referral.yourCode')}
          </label>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-lg font-bold text-gray-800 text-center">
              {referralCode || '---'}
            </div>
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => shareOn('whatsapp')}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={() => shareOn('twitter')}
            className="flex-1 flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="hidden sm:inline">X</span>
          </button>
          <button
            onClick={() => shareOn('facebook')}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="hidden sm:inline">Facebook</span>
          </button>
          <button
            onClick={() => shareOn('email')}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Email</span>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{stats.successfulReferrals}</p>
              <p className="text-xs text-gray-500">{t('referral.successfulReferrals')}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalEarnings)}</p>
              <p className="text-xs text-gray-500">{t('referral.totalEarnings')}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${tierColors[stats.currentTier] || tierColors.Starter}`}>
                {stats.currentTier}
              </span>
              <p className="text-xs text-gray-500 mt-1">{t('referral.yourTier')}</p>
            </div>
          </div>
        )}

        {/* Progress to next tier */}
        {stats && stats.nextTier && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">
                {t('referral.referralsNeeded', { count: stats.referralsToNextTier, tier: stats.nextTier })}
              </span>
              <span className="font-medium text-purple-600">+{REFERRAL_CONFIG.tiers.find(t => t.name === stats.nextTier)?.bonusPercent || 0}% bonus</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (stats.successfulReferrals / (stats.successfulReferrals + stats.referralsToNextTier)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-800 mb-3">{t('referral.howItWorks')}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">1</span>
              <span>{t('referral.step1')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">2</span>
              <span>{t('referral.step2', { discount: REFERRAL_CONFIG.refereeDiscountPercent })}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">3</span>
              <span>{t('referral.step3', { reward: REFERRAL_CONFIG.referrerRewardPercent })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
