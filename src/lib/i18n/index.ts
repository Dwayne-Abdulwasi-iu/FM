/**
 * Internationalization (i18n) System
 * 
 * Supports:
 * - English (en) - Default
 * - French (fr) - Europe, Africa
 * - Spanish (es) - Americas, Europe
 * - Portuguese (pt) - Brazil, Portugal, Africa
 * - Chinese (zh) - China, Taiwan, Singapore
 * - Arabic (ar) - Middle East, North Africa
 * - Russian (ru) - Russia, Eastern Europe
 */

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';

export type Locale = 'en' | 'fr' | 'es' | 'pt' | 'zh' | 'ar' | 'ru';

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
    countries: ['US', 'GB', 'AU', 'CA', 'NG', 'GH', 'KE', 'ZA'],
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
    countries: ['FR', 'BE', 'CH', 'CA', 'SN', 'CI', 'CM'],
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇪🇸',
    countries: ['ES', 'MX', 'AR', 'CO', 'PE', 'CL'],
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    flag: '🇧🇷',
    countries: ['BR', 'PT', 'AO', 'MZ'],
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    flag: '🇨🇳',
    countries: ['CN', 'TW', 'SG', 'HK'],
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    flag: '🇸🇦',
    countries: ['SA', 'AE', 'EG', 'MA', 'DZ', 'IQ'],
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    flag: '🇷🇺',
    countries: ['RU', 'BY', 'KZ', 'UA'],
  },
];

export const DEFAULT_LOCALE: Locale = 'en';

// Type-safe translations
type TranslationKeys = typeof en;

const translations: Record<Locale, TranslationKeys> = {
  en,
  fr: fr as unknown as TranslationKeys,
  es: es as unknown as TranslationKeys,
  pt: pt as unknown as TranslationKeys,
  zh: zh as unknown as TranslationKeys,
  ar: ar as unknown as TranslationKeys,
  ru: ru as unknown as TranslationKeys,
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
    es: 'es-ES',
    pt: 'pt-BR',
    zh: 'zh-CN',
    ar: 'ar-SA',
    ru: 'ru-RU',
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
    es: 'es-ES',
    pt: 'pt-BR',
    zh: 'zh-CN',
    ar: 'ar-SA',
    ru: 'ru-RU',
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
    es: 'es-ES',
    pt: 'pt-BR',
    zh: 'zh-CN',
    ar: 'ar-SA',
    ru: 'ru-RU',
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

const i18nModule = {
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

export default i18nModule;
