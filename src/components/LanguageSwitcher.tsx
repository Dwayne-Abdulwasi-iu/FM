'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LocaleConfig } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'buttons' | 'compact';
  showFlag?: boolean;
  showNativeName?: boolean;
  className?: string;
}

export default function LanguageSwitcher({
  variant = 'dropdown',
  showFlag = true,
  showNativeName = true,
  className = '',
}: LanguageSwitcherProps) {
  const { locale, setLocale, supportedLocales, currentLocaleConfig } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (localeConfig: LocaleConfig) => {
    setLocale(localeConfig.code);
    setIsOpen(false);
  };

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {supportedLocales.map((loc) => (
          <button
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              locale === loc.code
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={loc.name}
          >
            {showFlag && <span className="mr-1">{loc.flag}</span>}
            {loc.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Change language"
        >
          <span className="text-lg">{currentLocaleConfig?.flag}</span>
          <span className="text-xs font-medium text-gray-600">
            {locale.toUpperCase()}
          </span>
          <svg
            className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {supportedLocales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => handleSelect(loc)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${
                  locale === loc.code ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{loc.flag}</span>
                <span className="text-sm">{loc.nativeName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default: dropdown
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        {showFlag && <span className="text-xl">{currentLocaleConfig?.flag}</span>}
        <span className="font-medium text-gray-700">
          {showNativeName ? currentLocaleConfig?.nativeName : currentLocaleConfig?.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase">Select Language</p>
          </div>
          {supportedLocales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleSelect(loc)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                locale === loc.code ? 'bg-purple-50' : ''
              }`}
            >
              <span className="text-2xl">{loc.flag}</span>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    locale === loc.code ? 'text-purple-700' : 'text-gray-900'
                  }`}
                >
                  {loc.nativeName}
                </p>
                <p className="text-xs text-gray-500">{loc.name}</p>
              </div>
              {locale === loc.code && (
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
