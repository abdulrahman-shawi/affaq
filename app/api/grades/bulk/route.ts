import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorScope } from "@/app/lib/supervisorScope";
import { getTeacherClassIds } from "@/app/lib/teacherScope";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "quiz",
  "exam",
  "homework",
  "manual",
  "dictation",
  "memorization",
]);

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
      name?: string;
      entries?: {
        studentId: string;
        subject: string;
        type: string;
        score: number;
        maxScore: number;
        note?: string;
      }[];
    };

    if (!classId || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // اسم الملف المشترك لكل الدرجات المرسلة — يفرَّغ ويقتطع لحد معقول
    const trimmedName =
      typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    const gradeName = trimmedName || null;

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

    // إعادة الرصد لنفس (طالب، مادة، نوع، اسم) تحدّث السجل ولا تكرّره —
    // الاسم يفصل ملفات التقييم المتعددة من نفس النوع عن بعضها،
    // ونستثني درجات التسليمات والاختبارات (submissionId مملوء) فلا نمسّها
    const count = await prisma.$transaction(async (tx) => {
      for (const e of entries) {
        const note =
          typeof e.note === "string" && e.note.trim() ? e.note.trim() : null;
        const existing = await tx.grade.findFirst({
          where: {
            studentId: e.studentId,
            subject: e.subject,
            type: e.type,
            name: gradeName,
            submissionId: null,
          },
          select: { id: true },
        });
        if (existing) {
          await tx.grade.update({
            where: { id: existing.id },
            data: {
              score: Number(e.score),
              maxScore: Number(e.maxScore),
              note,
            },
          });
        } else {
          await tx.grade.create({
            data: {
              studentId: e.studentId,
              subject: e.subject,
              type: e.type,
              score: Number(e.score),
              maxScore: Number(e.maxScore),
              note,
              name: gradeName,
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
