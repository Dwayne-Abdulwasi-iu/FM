"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import dynamic from 'next/dynamic'

// Load client-only InstallPrompt dynamically to avoid SSR issues
const InstallPrompt = dynamic(() => import('@/components/pwa/InstallPrompt'), { ssr: false })

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
      <InstallPrompt />
    </SessionProvider>
  );
}