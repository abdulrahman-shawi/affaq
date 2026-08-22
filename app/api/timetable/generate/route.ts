import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

/**
 * توليد حصص Session فعلية من جدول TimetableSlot لأسبوع كامل.
 * body: { date?: "YYYY-MM-DD" } — أي يوم داخل الأسبوع المطلوب (الافتراضي: اليوم).
 * بداية الأسبوع = الأحد (يتوافق مع dayOfWeek في الجدول ومع getDay() في JS).
 * العملية idempotent: الحصص الموجودة مسبقًا (نفس المعلم/الصف/المادة/الوقت) تُتخطّى.
 */
export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role !== "admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const base = body.date ? new Date(`${body.date}T00:00:00`) : new Date();
    if (isNaN(base.getTime())) {
      return NextResponse.json({ error: "التاريخ غير صالح" }, { status: 400 });
    }

    // الأحد الذي يبدأ به أسبوع التاريخ المحدد
    const weekStart = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate() - base.getDay()
    );
    const weekEnd = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 7
    );

    const slots = await prisma.timetableSlot.findMany({
      include: { class: true },
    });
    if (slots.length === 0) {
      return NextResponse.json(
        { error: "الجدول الأسبوعي فارغ — أضف حصصًا أولًا" },
        { status: 400 }
      );
    }

    const existing = await prisma.session.findMany({
      where: { date: { gte: weekStart, lt: weekEnd } },
      select: { teacherId: true, grade: true, subject: true, date: true },
    });
    const existingKeys = new Set(
      existing.map(
        (s) => `${s.teacherId}|${s.grade}|${s.subject}|${s.date.getTime()}`
      )
    );

    const toCreate = [];
    for (const slot of slots) {
      const [hours, minutes] = slot.startTime.split(":").map(Number);
      const date = new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + slot.dayOfWeek,
        hours,
        minutes,
        0,
        0
      );
      const key = `${slot.teacherId}|${slot.class.order}|${slot.subject}|${date.getTime()}`;
      if (existingKeys.has(key)) continue;
      toCreate.push({
        teacherId: slot.teacherId,
        grade: slot.class.order,
        subject: slot.subject,
        date,
        zoomLink: slot.zoomLink,
      });
    }

    if (toCreate.length > 0) {
      await prisma.session.createMany({ data: toCreate });
    }

    return NextResponse.json(
      {
        created: toCreate.length,
        skipped: slots.length - toCreate.length,
        weekStart: weekStart.toISOString().slice(0, 10),
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "فشل في توليد الحصص" }, { status: 500 });
  }
}
