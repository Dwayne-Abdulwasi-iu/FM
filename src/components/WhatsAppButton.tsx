'use client';

import { getSupportChatUrl, getClickToChatUrl } from '@/lib/whatsapp';

interface WhatsAppButtonProps {
  /** Phone number to chat with (for designer contact) */
  phoneNumber?: string;
  /** Pre-filled message */
  message?: string;
  /** Button variant */
  variant?: 'floating' | 'inline' | 'icon';
  /** Button text (for inline variant) */
  text?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
}

export default function WhatsAppButton({
  phoneNumber,
  message,
  variant = 'inline',
  text = 'Chat on WhatsApp',
  className = '',
  size = 'md',
}: WhatsAppButtonProps) {
  const url = phoneNumber
    ? getClickToChatUrl(phoneNumber, message)
    : getSupportChatUrl(message);

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const WhatsAppIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  if (variant === 'floating') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 ${sizeClasses[size]} ${className}`}
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className={iconSizes[size]} />
        
        {/* Pulse animation */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-300"></span>
        </span>
      </a>
    );
  }

  if (variant === 'icon') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors ${sizeClasses[size]} ${className}`}
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className={iconSizes[size]} />
      </a>
    );
  }

  // Default: inline button
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors ${
        size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-lg' : 'px-4 py-2'
      } ${className}`}
    >
      <WhatsAppIcon className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
      {text}
    </a>
  );
}

// Designer contact button with pre-filled message
interface DesignerWhatsAppButtonProps {
  designerName: string;
  designerPhone: string;
  designTitle?: string;
  className?: string;
}

export function DesignerWhatsAppButton({
  designerName,
  designerPhone,
  designTitle,
  className = '',
}: DesignerWhatsAppButtonProps) {
  const message = designTitle
    ? `Hi ${designerName}! I'm interested in your design "${designTitle}" on Fashion Marketplace.`
    : `Hi ${designerName}! I found you on Fashion Marketplace and would like to discuss a custom design.`;

  return (
    <WhatsAppButton
      phoneNumber={designerPhone}
      message={message}
      text={`Message ${designerName}`}
      className={className}
    />
  );
}

// Support chat button
interface SupportWhatsAppButtonProps {
  subject?: string;
  orderId?: string;
  className?: string;
}

export function SupportWhatsAppButton({
  subject,
  orderId,
  className = '',
}: SupportWhatsAppButtonProps) {
  let message = 'Hi! I need help with Fashion Marketplace.';
  
  if (orderId) {
    message = `Hi! I need help with my order #${orderId}.`;
  } else if (subject) {
    message = `Hi! I need help with: ${subject}`;
  }

  return (
    <WhatsAppButton
      message={message}
      text="Chat with Support"
      className={className}
    />
  );
}
