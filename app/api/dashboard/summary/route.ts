import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// لوحة تحكم الأدمن في طلب واحد: نفس الأرقام التي كانت تُحسب في المتصفح
// من 8 طلبات تُجيب كل جداول الأكاديمية، لكن بحساب جانب الخادم من استعلامات
// خفيفة — العرض النهائي على الصفحة مطابق تمامًا لما كان عليه
const DAY_MS = 24 * 60 * 60 * 1000;
const monthName = new Intl.DateTimeFormat("ar-EG", { month: "long" });

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const [
      students,
      teachersCount,
      liveByStatus,
      archiveByStatus,
      payments,
      pendingSubmissions,
      todayLiveAbsences,
      todayArchiveAbsences,
      todaySlots,
      recentAttempts,
    ] = await Promise.all([
      // توزيع الطلاب + اشتراكات تنتهي — حقول صغيرة فقط بدل سجلات كاملة
      prisma.student.findMany({
        select: {
          id: true,
          subEndDate: true,
          user: { select: { name: true } },
          class: { select: { name: true } },
        },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.teacher.count(),
      prisma.attendance.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.attendanceArchive.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      // كل المدفوعات بحقولها الصغيرة — لا حاجة لسحب بيانات الطالب الكاملة
      prisma.payment.findMany({
        select: {
          id: true,
          amount: true,
          date: true,
          student: {
            select: { currency: true, user: { select: { name: true } } },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.submission.count({ where: { grade: null } }),
      prisma.attendance.findMany({
        where: {
          status: "absent",
          session: { date: { gte: todayStart, lte: todayEnd } },
        },
        select: {
          id: true,
          student: { select: { user: { select: { name: true } } } },
          session: { select: { subject: true, date: true } },
        },
      }),
      prisma.attendanceArchive.findMany({
        where: { status: "absent", date: { gte: todayStart, lte: todayEnd } },
        select: {
          id: true,
          subject: true,
          date: true,
          student: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.timetableSlot.findMany({
        where: { dayOfWeek: now.getDay() },
        select: {
          id: true,
          subject: true,
          startTime: true,
          endTime: true,
          teacher: { select: { user: { select: { name: true } } } },
          class: { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.quizAttempt.findMany({
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          score: true,
          maxScore: true,
          submittedAt: true,
          quiz: { select: { title: true } },
          student: { select: { user: { select: { name: true } } } },
        },
      }),
    ]);

    // توزيع الطلاب حسب الصف — بنفس ترتيب الظهور القديم (ترتيب الاسم)
    const gradeDistribution: { name: string; count: number }[] = [];
    const distIndex = new Map<string, number>();
    for (const s of students) {
      const name = s.class?.name ?? "بدون صف";
      const i = distIndex.get(name);
      if (i === undefined) {
        distIndex.set(name, gradeDistribution.length);
        gradeDistribution.push({ name, count: 1 });
      } else {
        gradeDistribution[i].count += 1;
      }
    }

    // اشتراكات تنتهي خلال 7 أيام
    const expiringStudents = students
      .filter((s) => {
        if (!s.subEndDate) return false;
        const days = Math.ceil(
          (new Date(s.subEndDate).getTime() - now.getTime()) / DAY_MS
        );
        return days >= 0 && days <= 7;
      })
      .map((s) => ({
        id: s.id,
        name: s.user.name ?? "طالب",
        days: Math.ceil(
          (new Date(s.subEndDate!).getTime() - now.getTime()) / DAY_MS
        ),
      }))
      .sort((a, b) => a.days - b.days);

    // الإيرادات لكل عملة + الشهري لآخر 6 أشهر
    const revenueByCurrency: Record<string, number> = {};
    const months: { name: string; total: number; start: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ name: monthName.format(start), total: 0, start });
    }
    for (const p of payments) {
      const cur = p.student?.currency ?? "SAR";
      revenueByCurrency[cur] = (revenueByCurrency[cur] ?? 0) + p.amount;
      const d = new Date(p.date);
      const bucket = months.find(
        (m) =>
          m.start.getFullYear() === d.getFullYear() &&
          m.start.getMonth() === d.getMonth()
      );
      if (bucket) bucket.total += p.amount;
    }

    const present =
      liveByStatus.find((g) => g.status === "present")?._count._all ?? 0;
    const presentArch =
      archiveByStatus.find((g) => g.status === "present")?._count._all ?? 0;
    const totalLive = liveByStatus.reduce((n, g) => n + g._count._all, 0);
    const totalArch = archiveByStatus.reduce((n, g) => n + g._count._all, 0);
    const total = totalLive + totalArch;

    return NextResponse.json({
      studentsCount: students.length,
      teachersCount,
      attendanceRate: total > 0 ? Math.round(((present + presentArch) / total) * 100) : 0,
      revenueByCurrency,
      monthlyRevenue: months.map(({ name, total }) => ({ name, total })),
      gradeDistribution,
      expiringStudents,
      pendingSubmissions,
      todayAbsences: [
        ...todayLiveAbsences
          .map((a) => ({
            id: a.id,
            name: a.student?.user?.name ?? "طالب",
            subject: a.session?.subject ?? "",
            date: a.session?.date ?? now,
          })),
        // نفس تنسيق المعرّف القديم للسجلات المؤرشفة حتى تبقى مفاتيح القائمة فريدة
        ...todayArchiveAbsences.map((a) => ({
          id: `archive:${a.id}`,
          name: a.student?.user?.name ?? "طالب",
          subject: a.subject,
          date: a.date,
        })),
      ]
        // ترتيب الدمج القديم: الأحدث أولًا حسب تاريخ الحصة
        .sort((x, y) => y.date.getTime() - x.date.getTime())
        .map(({ id, name, subject }) => ({ id, name, subject })),
      todaySlots: todaySlots.map((s) => ({
        id: s.id,
        subject: s.subject,
        teacherName: s.teacher?.user?.name ?? null,
        className: s.class?.name ?? null,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      recentPayments: payments.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.student?.user?.name ?? "طالب",
        amount: p.amount,
        currency: p.student?.currency ?? "SAR",
        date: p.date,
      })),
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id,
        quizTitle: a.quiz.title,
        studentName: a.student?.user?.name ?? "طالب",
        score: a.score,
        maxScore: a.maxScore,
        submittedAt: a.submittedAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "فشل في تحميل ملخص اللوحة" },
      { status: 500 }
    );
  }
}
