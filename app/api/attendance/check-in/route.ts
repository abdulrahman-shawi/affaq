import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// تسجيل حضور ذاتي للطالب عند دخوله حصة اليوم من صفحة "حصصي"
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "student") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: sessionUser.id },
      include: { class: true },
    });
    if (!student?.classId || !student.class) {
      return NextResponse.json(
        { error: "لم يُسند لك صف بعد" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 });
    }

    // grade في الحصة يطابق order في الصف الدراسي
    if (session.grade !== student.class.order) {
      return NextResponse.json(
        { error: "هذه الحصة ليست لصفّك" },
        { status: 403 }
      );
    }

    // لا يمكن الدخول إلا في يوم الحصة نفسه
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    if (session.date < dayStart || session.date > dayEnd) {
      return NextResponse.json(
        { error: "هذه الحصة ليست مجدولة اليوم" },
        { status: 400 }
      );
    }

    if (!session.zoomLink) {
      return NextResponse.json(
        { error: "لا يوجد رابط زوم لهذه الحصة" },
        { status: 400 }
      );
    }

    // تحديد الحالة حسب وقت الدخول مقارنة ببداية الحصة المجدولة:
    // دخول قبل البداية = حاضر، دخول بعدها (مع مهلة سماح) = متأخر
    const localNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Damascus" })
    );
    const LATE_GRACE_MINUTES = 5;
    let targetStatus: "present" | "late" = "present";
    const slot = await prisma.timetableSlot.findFirst({
      where: {
        teacherId: session.teacherId,
        subject: session.subject,
        dayOfWeek: localNow.getDay(),
        class: { order: student.class.order },
      },
    });
    if (slot) {
      const [h, m] = slot.startTime.split(":").map(Number);
      const startMinutes = h * 60 + m;
      const nowMinutes = localNow.getHours() * 60 + localNow.getMinutes();
      if (nowMinutes > startMinutes + LATE_GRACE_MINUTES) {
        targetStatus = "late";
      }
    }

    // دخول الطالب الحصة = حضور: ننشئ سجلًا إن لم يوجد،
    // ونرقّي أي حالة سابقة (غائب/متأخر) دون أن نخفض "حاضر" إلى "متأخر"
    const RANK: Record<string, number> = { absent: 0, late: 1, present: 2 };
    const existing = await prisma.attendance.findFirst({
      where: { sessionId: session.id, studentId: student.id },
    });
    const finalStatus =
      !existing || RANK[targetStatus] > (RANK[existing.status] ?? 0)
        ? targetStatus
        : existing.status;
    if (!existing) {
      await prisma.attendance.create({
        data: {
          sessionId: session.id,
          studentId: student.id,
          status: targetStatus,
        },
      });
    } else if (finalStatus !== existing.status) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: finalStatus },
      });
    }

    return NextResponse.json({
      zoomLink: session.zoomLink,
      status: finalStatus,
    });
  } catch {
    return NextResponse.json({ error: "فشل في تسجيل الحضور" }, { status: 500 });
  }
}
