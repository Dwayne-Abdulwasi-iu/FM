'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import i18n, {
  Locale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LocaleConfig,
  t as translate,
  getStoredLocale,
  saveLocale,
  detectBrowserLocale,
  formatCurrency as formatCurrencyFn,
  formatDate as formatDateFn,
  formatRelativeTime as formatRelativeTimeFn,
} from '@/lib/i18n';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | string) => string;
  supportedLocales: LocaleConfig[];
  currentLocaleConfig: LocaleConfig | undefined;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function LanguageProvider({ children, defaultLocale }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale || DEFAULT_LOCALE);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale from storage or browser
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLocaleState(stored);
    } else {
      const detected = detectBrowserLocale();
      setLocaleState(detected);
    }
    setIsLoading(false);
  }, []);

  // Update document lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      const config = i18n.getLocaleConfig(locale);
      if (config) {
        document.documentElement.dir = config.direction;
      }
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: string, variables?: Record<string, string | number>) => {
      return translate(key, locale, variables);
    },
    [locale]
  );

  const formatCurrency = useCallback(
    (amount: number, currency: string = 'USD') => {
      return formatCurrencyFn(amount, currency, locale);
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      return formatDateFn(date, locale, options);
    },
    [locale]
  );

  const formatRelativeTime = useCallback(
    (date: Date | string) => {
      return formatRelativeTimeFn(date, locale);
    },
    [locale]
  );

  const currentLocaleConfig = i18n.getLocaleConfig(locale);

  const value: LanguageContextType = {
    locale,
    setLocale,
    t,
    formatCurrency,
    formatDate,
    formatRelativeTime,
    supportedLocales: SUPPORTED_LOCALES,
    currentLocaleConfig,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Convenience hook for just translations
export function useTranslation() {
  const { t, locale } = useLanguage();
  return { t, locale };
}

export default LanguageContext;
