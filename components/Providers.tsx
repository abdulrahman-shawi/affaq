"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toaster";
import SiteSettingsProvider from "@/components/SiteSettingsProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <SiteSettingsProvider>{children}</SiteSettingsProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
