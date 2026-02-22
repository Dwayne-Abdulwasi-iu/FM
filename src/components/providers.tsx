"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

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
      <LanguageProvider>
        <CurrencyProvider>
          {children}
          <OnboardingTour />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontSize: "0.82rem",
                lineHeight: 1.25,
                maxWidth: "280px",
                width: "min(280px, 88vw)",
                padding: "8px 10px",
                borderRadius: "10px",
              },
            }}
          />
        </CurrencyProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}