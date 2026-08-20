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

    // الطالب لا يصل إلى المسودات
    if (sessionUser.role === "student" && !quiz.published) {
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
    const { title, subject, grade, questions, durationMinutes, published } = body;

    // تحديث جزئي: نبني الحقول المقدَّمة فقط (مثل تبديل النشر وحده)
    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (!title?.trim()) {
        return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
      }
      data.title = title.trim();
    }
    if (subject !== undefined) {
      if (!subject) {
        return NextResponse.json({ error: "المادة مطلوبة" }, { status: 400 });
      }
      data.subject = subject;
    }
    if (grade !== undefined) {
      if (!grade) {
        return NextResponse.json({ error: "الصف مطلوب" }, { status: 400 });
      }
      data.grade = Number(grade);
    }
    if (durationMinutes !== undefined) {
      if (
        durationMinutes !== null &&
        (!Number.isInteger(Number(durationMinutes)) ||
          Number(durationMinutes) <= 0)
      ) {
        return NextResponse.json(
          { error: "مدة الاختبار يجب أن تكون عددًا صحيحًا موجبًا من الدقائق" },
          { status: 400 }
        );
      }
      data.durationMinutes = durationMinutes ? Number(durationMinutes) : null;
    }
    if (published !== undefined) {
      data.published = Boolean(published);
    }

    const hasQuestions = questions !== undefined;
    if (hasQuestions) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { error: "الاختبار يحتاج سؤالًا واحدًا على الأقل" },
          { status: 400 }
        );
      }
      const invalid = questions.some(
        (q: {
          type?: string;
          text?: string;
          options?: string[];
          correctIndex?: number;
          points?: number;
        }) => {
          if (!q.text?.trim() || !Array.isArray(q.options)) return true;
          if (q.points !== undefined && Number(q.points) <= 0) return true;
          const isTrueFalse = q.type === "truefalse";
          const expectedOptions = isTrueFalse ? 2 : 4;
          return (
            q.options!.length !== expectedOptions ||
            q.options!.some((o) => !o?.trim()) ||
            !Number.isInteger(q.correctIndex) ||
            q.correctIndex! < 0 ||
            q.correctIndex! >= expectedOptions
          );
        }
      );
      if (invalid) {
        return NextResponse.json(
          { error: "كل سؤال يحتاج نصًا وخيارات مكتملة وإجابة صحيحة محددة" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(data).length === 0 && !hasQuestions) {
      return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
    }

    // عند تمرير أسئلة نستبدلها بالكامل؛ المحاولات السابقة تبقى بدرجاتها كسجل تاريخي
    const quiz = await prisma.$transaction(async (tx) => {
      if (hasQuestions) {
        await tx.quizQuestion.deleteMany({ where: { quizId: params.id } });
        await tx.quizQuestion.createMany({
          data: questions.map(
            (q: {
              type?: string;
              text: string;
              options: string[];
              correctIndex: number;
              points?: number;
            }) => ({
              quizId: params.id,
              type: q.type === "truefalse" ? "truefalse" : "mcq",
              text: q.text.trim(),
              options: q.options.map((o: string) => o.trim()),
              correctIndex: q.correctIndex,
              points: q.points !== undefined ? Number(q.points) : 1,
            })
          ),
        });
      }
      return tx.quiz.update({
        where: { id: params.id },
        data,
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
