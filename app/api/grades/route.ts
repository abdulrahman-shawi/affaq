import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorClassIds, getSupervisorScope } from "@/app/lib/supervisorScope";
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
    const supervisorScope = await getSupervisorScope(sessionUser);
    const teacherScoped = supervisorScope
      ? null
      : await getTeacherClassIds(sessionUser);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const grades = await prisma.grade.findMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(supervisorScope
          ? {
              OR: [
                {
                  student: {
                    classId: { in: supervisorScope.unrestrictedClassIds },
                  },
                },
                {
                  student: {
                    classId: { in: supervisorScope.restrictedClassIds },
                  },
                  subject: { in: supervisorScope.restrictedSubjectNames },
                },
              ],
            }
          : teacherScoped
            ? { student: { classId: { in: teacherScoped } } }
            : {}),
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
    // الرصد المفرد يدويًا للمدير والمشرف فقط — أما المعلم فرصدُه اليدوي
    // يتم من شبكة الإدخال عبر POST /api/grades/bulk ضمن صفوفه
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

// تعديل درجة محفوظة — المعلم صفوفه، والمشرف نطاقه، والمدير بلا تقييد
// درجات التسليمات (submissionId مملوء) تُعدّل من صفحة التسليمات كي تبقى
// متزامنة مع درجة التسليم نفسه
export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (
      !sessionUser ||
      !["admin", "supervisor", "teacher"].includes(sessionUser.role)
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { id, score, maxScore, note } = body;

    if (!id || score === undefined || !maxScore) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const existing = await prisma.grade.findUnique({
      where: { id },
      include: { student: { select: { classId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "الدرجة غير موجودة" }, { status: 404 });
    }
    if (existing.submissionId) {
      return NextResponse.json(
        { error: "درجات التسليمات تُعدّل من صفحة التسليمات" },
        { status: 400 }
      );
    }

    // المشرف يُحصر بصفوف إشرافه وموادّه المقيّدة، والمعلم بصفوفه
    const supervisorScope = await getSupervisorScope(sessionUser);
    if (supervisorScope) {
      const classId = existing.student.classId;
      const inUnrestricted =
        !!classId && supervisorScope.unrestrictedClassIds.includes(classId);
      const inRestricted =
        !!classId &&
        supervisorScope.restrictedClassIds.includes(classId) &&
        supervisorScope.restrictedSubjectNames.includes(existing.subject);
      if (!inUnrestricted && !inRestricted) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    } else if (sessionUser.role === "teacher") {
      const teacherScoped = (await getTeacherClassIds(sessionUser)) ?? [];
      if (
        !existing.student.classId ||
        !teacherScoped.includes(existing.student.classId)
      ) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    }

    const s = Number(score);
    const m = Number(maxScore);
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0 || s < 0 || s > m) {
      return NextResponse.json(
        { error: "الدرجة يجب أن تكون بين 0 والدرجة العظمى" },
        { status: 400 }
      );
    }

    const grade = await prisma.grade.update({
      where: { id },
      data: {
        score: s,
        maxScore: m,
        note: typeof note === "string" && note.trim() ? note.trim() : null,
      },
      include: { student: { include: { user: true } } },
    });

    return NextResponse.json(grade);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل الدرجة" }, { status: 500 });
  }
}
