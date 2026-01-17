'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export function Footer() {
  const { t } = useLanguage()
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <h3 className="text-sm sm:text-base font-semibold mb-2">{t('common.appName')}</h3>
            <p className="text-gray-400 text-xs sm:text-sm leading-snug">
              {t('footer.tagline') || 'The premier destination for fashion designers to showcase and sell their creative work.'}
            </p>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2">{t('footer.forDesigners') || 'For Designers'}</h4>
            <ul className="space-y-1 text-gray-400 text-xs sm:text-sm">
              <li><Link href="/upload" className="hover:text-white">{t('footer.startSelling') || 'Start Selling'}</Link></li>
              <li><Link href="/resources" className="hover:text-white">{t('footer.resources') || 'Resources'}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2">{t('footer.forBuyers') || 'For Buyers'}</h4>
            <ul className="space-y-1 text-gray-400 text-xs sm:text-sm">
              <li><Link href="/designs" className="hover:text-white">{t('designs.designs') || 'Browse Designs'}</Link></li>
              <li><Link href="/categories" className="hover:text-white">{t('nav.categories')}</Link></li>
              <li><Link href="/trending" className="hover:text-white">{t('nav.trending')}</Link></li>
              <li><Link href="/buyer-protection" className="hover:text-white">{t('footer.buyerProtection') || 'Buyer Protection'}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2">{t('footer.support') || 'Support'}</h4>
            <ul className="space-y-1 text-gray-400 text-xs sm:text-sm">
              <li><Link href="/help" className="hover:text-white">{t('footer.helpCenter')}</Link></li>
              <li><Link href="/customer-care" className="hover:text-white">{t('footer.customerCare') || 'Customer Care'}</Link></li>
              <li><Link href="/contact" className="hover:text-white">{t('footer.contactUs')}</Link></li>
              <li><Link href="/terms" className="hover:text-white">{t('footer.termsOfService')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-4 sm:mt-6 pt-4 sm:pt-6 text-center text-gray-400 text-xs sm:text-sm">
          <p>&copy; 2024 {t('common.appName')}. {t('footer.allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}