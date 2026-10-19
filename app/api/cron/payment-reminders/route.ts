import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { formatDate } from "@/app/lib/utils";

export const dynamic = "force-dynamic";

const REMINDER_WINDOW_DAYS = 7;

/**
 * Cron endpoint: يُرسل تذكيرًا لولي الأمر قبل انتهاء اشتراك ابنه
 * (استحقاق الدفع) بـ 7 أيام أو أقل. يُرسل تذكير واحد لكل دورة اشتراك
 * عبر Student.subReminderAt. Protect with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */
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
    const windowEnd = new Date(
      now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    // طلاب اشتراكاتهم تنتهي خلال نافذة التذكير ولهم ولي أمر
    const students = await prisma.student.findMany({
      where: {
        status: "active",
        subEndDate: { gte: now, lte: windowEnd },
        parentId: { not: null },
      },
      include: { user: true, parent: true },
    });

    let reminded = 0;
    for (const student of students) {
      const windowStart = new Date(
        student.subEndDate!.getTime() -
          REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000
      );
      // تخطَّ إن أُرسل تذكير لهذه الدورة مسبقًا
      if (student.subReminderAt && student.subReminderAt >= windowStart) {
        continue;
      }

      const daysLeft = Math.ceil(
        (student.subEndDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      await prisma.notification.create({
        data: {
          userId: student.parent!.userId,
          title: "تذكير بسداد الاشتراك",
          body: `اشتراك الطالب ${student.user.name} ينتهي خلال ${daysLeft} ${
            daysLeft === 1 ? "يوم" : "أيام"
          } (${formatDate(student.subEndDate)}). يرجى السداد لتجنب انقطاع الخدمة.`,
          type: "subscription",
          link: "/dashboard/parent/children",
        },
      });

      await prisma.student.update({
        where: { id: student.id },
        data: { subReminderAt: now },
      });
      reminded += 1;
    }

    return NextResponse.json({ reminded, candidates: students.length });
  } catch {
    return NextResponse.json(
      { error: "فشل في إرسال تذكيرات المدفوعات" },
      { status: 500 }
    );
  }
}
