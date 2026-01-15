'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type PaymentMethod = 'stripe' | 'paystack' | 'flutterwave';

interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  countries: string[];
  requiresPhone?: boolean;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  phoneNumber?: string;
  onPhoneChange?: (phone: string) => void;
  countryCode?: string;
  onCountryChange?: (country: string) => void;
  availableMethods?: PaymentMethod[];
}

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'stripe',
    name: 'Card Payment',
    description: 'Pay with Visa, Mastercard, or American Express',
    icon: '💳',
    countries: ['US', 'UK', 'EU', 'GLOBAL'],
  },
  {
    id: 'paystack',
    name: 'Paystack',
    description: 'Pay with Nigerian bank account, cards, or USSD',
    icon: '🏦',
    countries: ['NG', 'GH', 'ZA', 'KE'],
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    description: 'Pay with bank, mobile money, or cards across Africa',
    icon: '🌍',
    countries: ['NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'RW', 'CI', 'CM', 'SN'],
  },
];

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', currency: 'XAF' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', currency: 'XOF' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
];

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  phoneNumber: _phoneNumber = '',
  onPhoneChange: _onPhoneChange,
  countryCode = 'NG',
  onCountryChange,
  availableMethods = ['stripe', 'paystack', 'flutterwave'],
}: PaymentMethodSelectorProps) {
  const { t: _t } = useLanguage();
  const [filteredMethods, setFilteredMethods] = useState<PaymentMethodConfig[]>([]);

  useEffect(() => {
    // Filter methods based on availability and country
    const methods = PAYMENT_METHODS.filter((method) => {
      if (!availableMethods.includes(method.id)) return false;
      // Show method if it supports the selected country or is global
      return method.countries.includes(countryCode) || method.countries.includes('GLOBAL');
    });
    setFilteredMethods(methods);

    // Auto-select first available method if current selection is not available
    if (methods.length > 0 && !methods.find((m) => m.id === selectedMethod)) {
      onMethodChange(methods[0].id);
    }
  }, [countryCode, availableMethods, selectedMethod, onMethodChange]);

  const _selectedConfig = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  return (
    <div className="space-y-6">
      {/* Country Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Country
        </label>
        <select
          value={countryCode}
          onChange={(e) => onCountryChange?.(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name} ({country.currency})
            </option>
          ))}
        </select>
      </div>

      {/* Payment Methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMethods.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => onMethodChange(method.id)}
              className={`flex items-start gap-3 p-4 border-2 rounded-xl transition-all text-left ${
                selectedMethod === method.id
                  ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${
                  selectedMethod === method.id ? 'text-purple-700' : 'text-gray-900'
                }`}>
                  {method.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {method.description}
                </p>
              </div>
              {selectedMethod === method.id && (
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {filteredMethods.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No payment methods available for your country
          </p>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>All payments are secure and encrypted</span>
      </div>
    </div>
  );
}
