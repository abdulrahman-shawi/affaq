import { cache } from "react";
import { prisma } from "./prisma";
import type { SiteSettingsDTO } from "@/types";

export const defaultSiteSettings: SiteSettingsDTO = {
  siteName: "آفاق أكاديمي",
  academyName: "آفاق أكاديمي",
  logoUrl: null,
  faviconUrl: null,
};

// قراءة إعدادات الموقع من جهة الخادم (تُستخدم في layout وصفحة الهبوط)
// cache من react تمنع تكرار الاستعلام ضمن الطلب الواحد
export const getSiteSettings = cache(async (): Promise<SiteSettingsDTO> => {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "site" } });
    if (!row) return defaultSiteSettings;
    return {
      siteName: row.siteName,
      academyName: row.academyName,
      logoUrl: row.logoUrl,
      faviconUrl: row.faviconUrl,
    };
  } catch {
    return defaultSiteSettings;
  }
});
