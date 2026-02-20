// Badge component for verified sellers
'use client';

import { PropsWithChildren } from 'react';

interface VerifiedBadgeProps {
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * Badge to indicate a seller has been verified by the platform
 * Shows a checkmark icon with optional text
 */
export function VerifiedBadge({
  isVerified = false,
  size = 'md',
  showText = true,
  className = '',
}: VerifiedBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full ${sizeClasses[size]} ${className}`}
      title="Verified Seller - This seller has been verified by the Fashion Marketplace"
    >
      <svg
        className="w-full h-full flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      {showText && <span className="font-semibold whitespace-nowrap">Verified</span>}
    </span>
  );
}

/**
 * Inline verified checkmark indicator - minimal version
 * Good for product cards where space is limited
 */
export function VerifiedCheckmark({
  isVerified = false,
  className = '',
}: {
  isVerified?: boolean;
  className?: string;
}) {
  if (!isVerified) return null;

  return (
    <svg
      className={`w-5 h-5 text-blue-600 flex-shrink-0 ${className}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      title="Verified Seller"
    >
      <path
        fillRule="evenodd"
        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
