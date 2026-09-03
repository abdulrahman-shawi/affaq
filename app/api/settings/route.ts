import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { defaultSiteSettings } from "@/app/lib/settings";

export const dynamic = "force-dynamic";

// قراءة عامة — الاسم واللوغو مطلوبان في صفحات الدخول والهبوط قبل تسجيل الدخول
export async function GET() {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "site" } });
    return NextResponse.json(row ?? defaultSiteSettings);
  } catch {
    return NextResponse.json(defaultSiteSettings);
  }
}

export async function PUT(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { siteName, academyName, logoUrl } = body;

    if (!siteName?.trim() || !academyName?.trim()) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: "site" },
      create: {
        id: "site",
        siteName: siteName.trim(),
        academyName: academyName.trim(),
        logoUrl: logoUrl || null,
      },
      update: {
        siteName: siteName.trim(),
        academyName: academyName.trim(),
        logoUrl: logoUrl || null,
      },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "فشل في حفظ الإعدادات" }, { status: 500 });
  }
}
