import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import '../globals.css';

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Coming Soon - Fashion Marketplace',
  description: 'Something beautiful is coming. Get early access to Fashion Marketplace and join the fashion revolution.',
  keywords: ['fashion', 'design', 'marketplace', 'coming-soon', 'designers', 'illustrations'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fashionmarketplace.store/coming-soon',
    siteName: 'Fashion Marketplace',
    title: '✨ Fashion Marketplace - Coming Soon',
    description: 'Something beautiful is coming. Get early access to Fashion Marketplace and join the fashion revolution.',
    images: [
      {
        url: 'https://fashionmarketplace.store/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Fashion Marketplace Coming Soon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '✨ Fashion Marketplace - Coming Soon',
    description: 'Something beautiful is coming. Get early access to Fashion Marketplace and join the fashion revolution.',
    images: ['https://fashionmarketplace.store/og-image.png'],
  },
};

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {/* No Navbar or Footer - standalone page only */}
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
