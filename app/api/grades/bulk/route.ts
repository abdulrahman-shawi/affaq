import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorScope } from "@/app/lib/supervisorScope";
import { getTeacherClassIds } from "@/app/lib/teacherScope";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["quiz", "exam", "homework", "manual"]);

// رصد جماعي من شبكة الإدخال اليدوي — للمعلم (صفوفه) والمشرف (نطاقه) والمدير
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (
      !sessionUser ||
      !["admin", "supervisor", "teacher"].includes(sessionUser.role)
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { classId, entries } = body as {
      classId?: string;
      entries?: {
        studentId: string;
        subject: string;
        type: string;
        score: number;
        maxScore: number;
      }[];
    };

    if (!classId || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // المشرف يُحصر بصفوف الإشراف، والمعلم بصفوفه
    const supervisorScope = await getSupervisorScope(sessionUser);
    const teacherScoped = supervisorScope
      ? null
      : await getTeacherClassIds(sessionUser);
    if (
      supervisorScope &&
      ![
        ...supervisorScope.unrestrictedClassIds,
        ...supervisorScope.restrictedClassIds,
      ].includes(classId)
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    if (teacherScoped && !teacherScoped.includes(classId)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classId },
      include: { subjects: true, students: true },
    });
    if (!classLevel) {
      return NextResponse.json({ error: "الصف غير موجود" }, { status: 404 });
    }

    const studentIds = new Set(classLevel.students.map((s) => s.id));
    const subjectNames = new Set(classLevel.subjects.map((s) => s.name));
    // المشرف المقيَّد بمواد محددة في صف من صفوفه المقيَّدة يرصدها فقط
    const subjectScope =
      supervisorScope &&
      supervisorScope.restrictedClassIds.includes(classId) &&
      !supervisorScope.unrestrictedClassIds.includes(classId)
        ? new Set(supervisorScope.restrictedSubjectNames)
        : null;

    for (const e of entries) {
      const score = Number(e.score);
      const maxScore = Number(e.maxScore);
      if (
        !studentIds.has(e.studentId) ||
        !subjectNames.has(e.subject) ||
        (subjectScope && !subjectScope.has(e.subject)) ||
        !ALLOWED_TYPES.has(e.type)
      ) {
        return NextResponse.json(
          { error: "يوجد مدخل غير صالح (طالب أو مادة أو نوع)" },
          { status: 400 }
        );
      }
      if (
        !Number.isFinite(score) ||
        !Number.isFinite(maxScore) ||
        maxScore <= 0 ||
        score < 0 ||
        score > maxScore
      ) {
        return NextResponse.json(
          { error: `الدرجة يجب أن تكون بين 0 والدرجة العظمى (${e.subject})` },
          { status: 400 }
        );
      }
    }

    // إعادة الرصد لنفس (طالب، مادة، نوع) تحدّث السجل ولا تكرّره —
    // نستثني درجات التسليمات والاختبارات (submissionId مملوء) فلا نمسّها
    const count = await prisma.$transaction(async (tx) => {
      for (const e of entries) {
        const existing = await tx.grade.findFirst({
          where: {
            studentId: e.studentId,
            subject: e.subject,
            type: e.type,
            submissionId: null,
          },
          select: { id: true },
        });
        if (existing) {
          await tx.grade.update({
            where: { id: existing.id },
            data: { score: Number(e.score), maxScore: Number(e.maxScore) },
          });
        } else {
          await tx.grade.create({
            data: {
              studentId: e.studentId,
              subject: e.subject,
              type: e.type,
              score: Number(e.score),
              maxScore: Number(e.maxScore),
            },
          });
        }
      }
      return entries.length;
    });

    return NextResponse.json({ count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في حفظ الدرجات" }, { status: 500 });
  }
}
