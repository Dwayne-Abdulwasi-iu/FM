/**
 * Internationalization (i18n) System
 * 
 * Supports:
 * - English (en) - Default
 * - French (fr) - West/Central Africa
 * - Swahili (sw) - East Africa
 * - Hausa (ha) - West Africa (Nigeria, Niger, Ghana)
 */

import en from './locales/en.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';
import ha from './locales/ha.json';

export type Locale = 'en' | 'fr' | 'sw' | 'ha';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
  countries: string[];
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇬🇧',
    countries: ['NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'ZM', 'ZW'],
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
    countries: ['SN', 'CI', 'CM', 'CD', 'CG', 'GA', 'BF', 'ML', 'NE', 'TG', 'BJ'],
  },
  {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    direction: 'ltr',
    flag: '🇰🇪',
    countries: ['KE', 'TZ', 'UG', 'RW', 'BI', 'CD'],
  },
  {
    code: 'ha',
    name: 'Hausa',
    nativeName: 'Hausa',
    direction: 'ltr',
    flag: '🇳🇬',
    countries: ['NG', 'NE', 'GH', 'CM', 'BF'],
  },
];

export const DEFAULT_LOCALE: Locale = 'en';

// Type-safe translations
type TranslationKeys = typeof en;

const translations: Record<Locale, TranslationKeys> = {
  en,
  fr: fr as unknown as TranslationKeys,
  sw: sw as unknown as TranslationKeys,
  ha: ha as unknown as TranslationKeys,
};

/**
 * Get translation for a key path (e.g., 'common.loading')
 */
export function t(
  keyPath: string,
  locale: Locale = DEFAULT_LOCALE,
  variables?: Record<string, string | number>
): string {
  const keys = keyPath.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations[locale] || translations[DEFAULT_LOCALE];

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to English if key not found
      value = keys.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj: any, k) => (obj && typeof obj === 'object' ? obj[k] : undefined),
        translations[DEFAULT_LOCALE]
      );
      break;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation key not found: ${keyPath}`);
    return keyPath;
  }

  // Replace variables (e.g., {{name}} -> value)
  if (variables) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => 
      String(variables[key] ?? `{{${key}}}`)
    );
  }

  return value;
}

/**
 * Get all translations for a locale
 */
export function getTranslations(locale: Locale = DEFAULT_LOCALE): TranslationKeys {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

/**
 * Get locale config by code
 */
export function getLocaleConfig(locale: Locale): LocaleConfig | undefined {
  return SUPPORTED_LOCALES.find((l) => l.code === locale);
}

/**
 * Detect locale from browser/navigator
 */
export function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const browserLang = navigator.language.split('-')[0].toLowerCase();
  
  if (SUPPORTED_LOCALES.some((l) => l.code === browserLang)) {
    return browserLang as Locale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Detect locale from country code
 */
export function detectLocaleFromCountry(countryCode: string): Locale {
  const code = countryCode.toUpperCase();
  
  // Check each locale for country match (prefer local language)
  for (const locale of SUPPORTED_LOCALES) {
    if (locale.code !== 'en' && locale.countries.includes(code)) {
      return locale.code;
    }
  }
  
  return DEFAULT_LOCALE;
}

/**
 * Get locale from cookie or localStorage
 */
export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;

  // Try localStorage first
  const stored = localStorage.getItem('locale');
  if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
    return stored as Locale;
  }

  // Try cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'locale' && SUPPORTED_LOCALES.some((l) => l.code === value)) {
      return value as Locale;
    }
  }

  return null;
}

/**
 * Save locale preference
 */
export function saveLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('locale', locale);
  document.cookie = `locale=${locale};path=/;max-age=31536000`; // 1 year
}

/**
 * Format currency based on locale
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: Locale = DEFAULT_LOCALE
): string {
  const localeMap: Record<Locale, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    sw: 'sw-KE',
    ha: 'ha-NG',
  };

  try {
    return new Intl.NumberFormat(localeMap[locale], {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported locales
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }
}

/**
 * Format date based on locale
 */
export function formatDate(
  date: Date | string,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const localeMap: Record<Locale, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    sw: 'sw-KE',
    ha: 'ha-NG',
  };

  const d = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  try {
    return new Intl.DateTimeFormat(localeMap[locale], options || defaultOptions).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(d);
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: Locale = DEFAULT_LOCALE
): string {
  const localeMap: Record<Locale, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    sw: 'sw-KE',
    ha: 'ha-NG',
  };

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(localeMap[locale], { numeric: 'auto' });

    if (diffDays > 0) return rtf.format(-diffDays, 'day');
    if (diffHours > 0) return rtf.format(-diffHours, 'hour');
    if (diffMins > 0) return rtf.format(-diffMins, 'minute');
    return rtf.format(-diffSecs, 'second');
  } catch {
    // Fallback
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'just now';
  }
}

export default {
  t,
  getTranslations,
  getLocaleConfig,
  detectBrowserLocale,
  detectLocaleFromCountry,
  getStoredLocale,
  saveLocale,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
};
