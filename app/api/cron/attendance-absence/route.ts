import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: تحذير الإدارة والمشرفين عندما يغيب طالب عن دخول أي حصة
 * 3 أيام دراسية متتالية (الأحد–الخميس).
 *
 * يعتمد "آخر دخول" (حاضر أو متأخر) من سجلات الحضور الحية + الأرشيف
 * (الحصص تُحذف بعد ساعتين فالتاريخ التاريخي موجود في AttendanceArchive).
 * تاريخ آخر دخول أقدم من 10 أيام يعني غيابًا أكبر من النافذة — يُتجاهل.
 *
 * الإشعار يُرسل مرة واحدة لكل حلقة غياب: فقط حين يكون عدد أيام الغياب
 * الدراسية بالضبط 3 — شغّله مرة يوميًا. Protect with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 */

// النافذة: عدد أيام الغياب الدراسية التي يُرسل عندها التحذير (مرة واحدة)
const WARNING_DAYS = 3;
// حد البحث عن آخر دخول — أقدم من ذلك فالغياب أكبر من النافذة حتمًا
const LOOKBACK_DAYS = 10;

// عدد أيام الدوام (الأحد=0 … الخميس=4) من اليوم التالي لآخر دخول حتى أمس —
// يُستبعد اليوم الحالي حتى لا يُحتسب قبل انتهاء حصصه
function schoolDaysMissed(lastJoin: Date, today: Date): number {
  let count = 0;
  const cur = new Date(lastJoin);
  cur.setHours(0, 0, 0, 0);
  cur.setDate(cur.getDate() + 1);
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    const dow = cur.getDay();
    if (dow >= 0 && dow <= 4) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
      }
    }

    // "اليوم" بتوقيت دمشق — نفس اعتماد check-in
    const now = new Date();
    const today = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Damascus" })
    );
    const since = new Date(today);
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const students = await prisma.student.findMany({
      where: { status: "active", classId: { not: null } },
      select: {
        id: true,
        user: { select: { name: true } },
        class: { select: { id: true, name: true } },
      },
    });
    const studentIds = students.map((s) => s.id);

    // آخر دخول لكل طالب (حاضر/متأخر) من الحضور الحي + الأرشيف
    const [live, archived] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          status: { in: ["present", "late"] },
          session: { date: { gte: since } },
        },
        select: { studentId: true, session: { select: { date: true } } },
      }),
      prisma.attendanceArchive.findMany({
        where: {
          studentId: { in: studentIds },
          status: { in: ["present", "late"] },
          date: { gte: since },
        },
        select: { studentId: true, date: true },
      }),
    ]);

    const lastJoin = new Map<string, Date>();
    const bump = (studentId: string, date: Date) => {
      const existing = lastJoin.get(studentId);
      if (!existing || date > existing) lastJoin.set(studentId, date);
    };
    live.forEach((r) => bump(r.studentId, r.session.date));
    archived.forEach((r) => bump(r.studentId, r.date));

    // الطلاب الغائبون 3 أيام دراسية بالضبط — تنبيه مرة واحدة لكل حلقة غياب
    const flagged = students.filter((s) => {
      const joinedAt = lastJoin.get(s.id);
      if (!joinedAt) return false; // لم يدخل أي حصة من قبل — خارج نطاق التحذير
      return schoolDaysMissed(joinedAt, today) === WARNING_DAYS;
    });

    if (flagged.length === 0) {
      return NextResponse.json({ flagged: 0, notified: 0 });
    }

    const [admins, supervisors] = await Promise.all([
      prisma.user.findMany({ where: { role: "admin" }, select: { id: true } }),
      prisma.user.findMany({
        where: {
          role: "supervisor",
          supervisedClasses: {
            some: { id: { in: flagged.map((s) => s.class!.id) } },
          },
        },
        select: { id: true, supervisedClasses: { select: { id: true } } },
      }),
    ]);

    const link = "/dashboard/admin/attendance";
    const data = flagged.flatMap((s) => {
      const title = "تحذير: غياب 3 أيام";
      const body = `الطالب ${s.user.name} من صف ${s.class!.name} لم يدخل أي حصة منذ 3 أيام دراسية متتالية`;
      const targets = [
        ...admins.map((a) => a.id),
        ...supervisors
          .filter((sup) =>
            sup.supervisedClasses.some((c) => c.id === s.class!.id)
          )
          .map((sup) => sup.id),
      ];
      return targets.map((userId) => ({
        userId,
        title,
        body,
        type: "attendance",
        link,
      }));
    });

    await prisma.notification.createMany({ data });

    return NextResponse.json({
      flagged: flagged.length,
      notified: data.length,
    });
  } catch {
    return NextResponse.json(
      { error: "فشل في فحص الغياب" },
      { status: 500 }
    );
  }
}
