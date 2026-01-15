import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PWARegister } from "@/components/pwa-register";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4f46e5',
};

export const metadata: Metadata = {
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fashion Marketplace',
    description: 'Discover unique fashion designs from talented designers worldwide.',
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
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <PWARegister />
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}