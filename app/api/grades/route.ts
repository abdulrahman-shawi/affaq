import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorClassIds } from "@/app/lib/supervisorScope";
import { getTeacherClassIds } from "@/app/lib/teacherScope";

export const dynamic = "force-dynamic";

// المشرف يُحصر بصفوف الإشراف، والمعلم بصفوفه — وغيرهما بلا تقييد
async function getScopedClassIds(sessionUser: { id: string; role: string }) {
  return (
    (await getSupervisorClassIds(sessionUser)) ??
    (await getTeacherClassIds(sessionUser))
  );
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const scoped = await getScopedClassIds(sessionUser);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const grades = await prisma.grade.findMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(scoped ? { student: { classId: { in: scoped } } } : {}),
      },
      include: { student: { include: { user: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(grades);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الدرجات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    // الرصد اليدوي أُزيل عن المعلم — درجاته تُنشأ تلقائيًا من تصحيح الاختبارات
    if (!sessionUser || !["admin", "supervisor"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const scoped = await getScopedClassIds(sessionUser);

    const body = await req.json();
    const { studentId, subject, type, score, maxScore, note } = body;

    if (!studentId || !subject || !type || score === undefined || !maxScore) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // المشرف والمعلم يرصدان درجات طلاب صفوفهم فقط
    if (scoped) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { classId: true },
      });
      if (!student?.classId || !scoped.includes(student.classId)) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    }

    const grade = await prisma.grade.create({
      data: {
        studentId,
        subject,
        type,
        score: Number(score),
        maxScore: Number(maxScore),
        note: note || null,
      },
      include: { student: { include: { user: true } } },
    });

    return NextResponse.json(grade, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في رصد الدرجة" }, { status: 500 });
  }
}
