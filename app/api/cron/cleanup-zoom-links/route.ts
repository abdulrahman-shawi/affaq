import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: يحذف روابط زوم بعد مرور ساعتين على بداية الحصة.
 * يشمل الحصص الأسبوعية (TimetableSlot) والحصص الفعلية (Session).
 * شغّله كل 10–15 دقيقة. Protect with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */
const ZOOM_LINK_TTL_MINUTES = 2 * 60;

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
      }
    }

    const now = new Date();
    // "الآن" بتوقيت الأكاديمية — أوقات الحصص محلية (دمشق) بينما الخادم قد يكون UTC
    const tzNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Damascus" })
    );
    const nowMinutes = tzNow.getHours() * 60 + tzNow.getMinutes();

    // الحصص الفعلية: date يخزّن تاريخ ووقت بداية الحصة
    const sessionsResult = await prisma.session.updateMany({
      where: {
        zoomLink: { not: null },
        date: { lte: new Date(now.getTime() - ZOOM_LINK_TTL_MINUTES * 60 * 1000) },
      },
      data: { zoomLink: null },
    });

    // الحصص الأسبوعية المتكررة: حصص يوم اليوم التي بدأت منذ ساعتين أو أكثر
    const slots = await prisma.timetableSlot.findMany({
      where: { dayOfWeek: tzNow.getDay(), zoomLink: { not: null } },
      select: { id: true, startTime: true },
    });
    const expiredSlotIds = slots
      .filter((s) => {
        const [h, m] = s.startTime.split(":").map(Number);
        return h * 60 + m + ZOOM_LINK_TTL_MINUTES <= nowMinutes;
      })
      .map((s) => s.id);

    const slotsResult = expiredSlotIds.length
      ? await prisma.timetableSlot.updateMany({
          where: { id: { in: expiredSlotIds } },
          data: { zoomLink: null },
        })
      : { count: 0 };

    return NextResponse.json({
      clearedSessions: sessionsResult.count,
      clearedSlots: slotsResult.count,
    });
  } catch {
    return NextResponse.json(
      { error: "فشل في تنظيف روابط زوم" },
      { status: 500 }
    );
  }
}
