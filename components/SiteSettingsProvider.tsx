"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SiteSettingsDTO } from "@/types";

const defaultSettings: SiteSettingsDTO = {
  siteName: "آفاق أكاديمي",
  academyName: "آفاق أكاديمي",
  logoUrl: null,
};

const SiteSettingsContext = createContext<SiteSettingsDTO & {
  refresh: () => void;
}>({ ...defaultSettings, refresh: () => {} });

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export default function SiteSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<SiteSettingsDTO>(defaultSettings);

  const refresh = useCallback(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSettings({
            siteName: data.siteName ?? defaultSettings.siteName,
            academyName: data.academyName ?? defaultSettings.academyName,
            logoUrl: data.logoUrl ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SiteSettingsContext.Provider value={{ ...settings, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
