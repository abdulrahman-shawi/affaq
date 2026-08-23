import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// تصحيح يدوي للأسئلة الكتابية: essayScores بترتيب أسئلة الاختبار (تُتجاهل قيم غير الكتابية)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; attemptId: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { teacher: true, questions: true },
    });
    if (!quiz) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    // المعلم يصحح اختباراته فقط، والمدير يصحح أي اختبار
    if (
      sessionUser.role !== "admin" &&
      quiz.teacher.userId !== sessionUser.id
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: params.attemptId },
    });
    if (!attempt || attempt.quizId !== quiz.id) {
      return NextResponse.json({ error: "المحاولة غير موجودة" }, { status: 404 });
    }

    const body = await req.json();
    const { essayScores } = body;
    if (!Array.isArray(essayScores) || essayScores.length !== quiz.questions.length) {
      return NextResponse.json({ error: "بيانات التصحيح ناقصة" }, { status: 400 });
    }

    const invalid = quiz.questions.some((q, i) => {
      if (q.type !== "essay") return false;
      const s = Number(essayScores[i]);
      return !Number.isFinite(s) || s < 0 || s > q.points;
    });
    if (invalid) {
      return NextResponse.json(
        { error: "درجة كل سؤال كتابي يجب أن تكون بين 0 ودرجة السؤال" },
        { status: 400 }
      );
    }

    // نعيد حساب الجزء المُصحَّح تلقائيًا من الإجابات المخزنة، ونضيف درجات الكتابية
    const answers = Array.isArray(attempt.answers)
      ? (attempt.answers as (number | string)[])
      : [];
    let score = 0;
    const normalizedScores = quiz.questions.map((q, i) => {
      if (q.type === "essay") return Number(essayScores[i]);
      if (answers[i] === q.correctIndex) score += q.points;
      return 0;
    });
    score += normalizedScores.reduce((sum, s) => sum + s, 0);

    const wasUngraded = !attempt.graded;
    const [updated] = await prisma.$transaction([
      prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { essayScores: normalizedScores, score, graded: true },
        include: { student: { include: { user: true } } },
      }),
      // درجة Grade تُنشأ عند أول تصحيح فقط؛ إعادة التصحيح تحدّث المحاولة دون تكرار السجل
      ...(wasUngraded
        ? [
            prisma.grade.create({
              data: {
                studentId: attempt.studentId,
                subject: quiz.subject,
                type: "quiz",
                score,
                maxScore: attempt.maxScore,
                note: quiz.title,
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "فشل في حفظ التصحيح" }, { status: 500 });
  }
}
