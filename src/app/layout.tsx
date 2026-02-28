import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RootLayoutContent } from "@/components/layout/root-layout-content";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4f46e5',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://fashionmarketplace.store'),
  title: "Fashion Marketplace - Sell & Buy Fashion Designs",
  description: "A marketplace for fashion designers to showcase and sell their illustrations, sketches, and designs.",
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fashion Marketplace',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Fashion Marketplace',
    title: 'Fashion Marketplace - Sell & Buy Fashion Designs',
    description: 'Discover unique fashion designs from talented designers worldwide.',
    images: [
      {
        url: '/favicon.svg',
        width: 1200,
        height: 630,
        alt: 'Fashion Marketplace - Star Logo',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fashion Marketplace - Sell & Buy Fashion Designs',
    description: 'Discover unique fashion designs from talented designers worldwide.',
    images: ['/favicon.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <RootLayoutContent>
            {children}
          </RootLayoutContent>
        </Providers>
      </body>
    </html>
  );
}