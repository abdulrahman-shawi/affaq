import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        teacher: { include: { user: true } },
        questions: true,
        attempts: { include: { student: { include: { user: true } } } },
      },
    });
    if (!quiz) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    // الطالب لا يحصل على correctIndex ولا على محاولات زملائه
    // إلا إذا أدّى الاختبار بنفسه (لمراجعة إجاباته)
    if (sessionUser.role === "student") {
      const myAttempts = quiz.attempts.filter(
        (a) => a.student.userId === sessionUser.id
      );
      const attempted = myAttempts.length > 0;
      return NextResponse.json({
        ...quiz,
        attempts: myAttempts,
        questions: attempted
          ? quiz.questions
          : quiz.questions.map(({ correctIndex: _c, ...q }) => q),
      });
    }

    return NextResponse.json(quiz);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الاختبار" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const existing = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { teacher: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    // المعلم يعدّل اختباراته فقط، والمدير يعدّل أي اختبار
    if (
      sessionUser.role !== "admin" &&
      existing.teacher.userId !== sessionUser.id
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { title, subject, grade, questions, durationMinutes } = body;

    if (
      !title?.trim() ||
      !subject ||
      !grade ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return NextResponse.json({ error: "بيانات الاختبار ناقصة" }, { status: 400 });
    }

    if (
      durationMinutes !== undefined &&
      durationMinutes !== null &&
      (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) <= 0)
    ) {
      return NextResponse.json(
        { error: "مدة الاختبار يجب أن تكون عددًا صحيحًا موجبًا من الدقائق" },
        { status: 400 }
      );
    }

    const invalid = questions.some(
      (q: {
        text?: string;
        options?: string[];
        correctIndex?: number;
        points?: number;
      }) =>
        !q.text?.trim() ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        q.options.some((o) => !o?.trim()) ||
        !Number.isInteger(q.correctIndex) ||
        q.correctIndex! < 0 ||
        q.correctIndex! > 3 ||
        (q.points !== undefined && Number(q.points) <= 0)
    );
    if (invalid) {
      return NextResponse.json(
        { error: "كل سؤال يحتاج نصًا و4 خيارات وإجابة صحيحة محددة" },
        { status: 400 }
      );
    }

    // نستبدل الأسئلة بالكامل؛ المحاولات السابقة تبقى بدرجاتها كسجل تاريخي
    const quiz = await prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({ where: { quizId: params.id } });
      return tx.quiz.update({
        where: { id: params.id },
        data: {
          title: title.trim(),
          subject,
          grade: Number(grade),
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
          questions: {
            create: questions.map(
              (q: {
                text: string;
                options: string[];
                correctIndex: number;
                points?: number;
              }) => ({
                text: q.text.trim(),
                options: q.options.map((o: string) => o.trim()),
                correctIndex: q.correctIndex,
                points: q.points !== undefined ? Number(q.points) : 1,
              })
            ),
          },
        },
        include: { questions: true },
      });
    });

    return NextResponse.json(quiz);
  } catch {
    return NextResponse.json({ error: "فشل في تعديل الاختبار" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { teacher: true },
    });
    if (!quiz) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    // المعلم يحذف اختباراته فقط، والمدير يحذف أي اختبار
    if (
      sessionUser.role !== "admin" &&
      quiz.teacher.userId !== sessionUser.id
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // الأسئلة والمحاولات تُحذف تلقائيًا (onDelete: Cascade)
    // درجات Grade المنشأة سابقًا تبقى كسجل تاريخي
    await prisma.quiz.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف الاختبار" }, { status: 500 });
  }
}
