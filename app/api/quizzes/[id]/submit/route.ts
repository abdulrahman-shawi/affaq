import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !["admin", "student"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { studentId, answers } = body;
    if (!studentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }
    // الطالب يسلّم لنفسه فقط (المدير يمكنه التسليم لأي طالب)
    if (sessionUser.role !== "admin" && student.userId !== sessionUser.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { questions: true },
    });
    if (!quiz) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }
    // لا تسليم على مسودة (قد تكون أُلغي نشرها بعد تحميل الطالب للقائمة)
    if (!quiz.published && sessionUser.role !== "admin") {
      return NextResponse.json(
        { error: "هذا الاختبار غير متاح حاليًا" },
        { status: 403 }
      );
    }
    if (answers.length !== quiz.questions.length) {
      return NextResponse.json(
        { error: "يجب الإجابة على جميع الأسئلة" },
        { status: 400 }
      );
    }

    // تطبيع الإجابات حسب نوع السؤال: نص للكتابية، وفهرس رقمي للاختيارية
    const normalized = quiz.questions.map((q, i) =>
      q.type === "essay" ? String(answers[i] ?? "").trim() : Number(answers[i])
    );
    const hasEssay = quiz.questions.some((q) => q.type === "essay");

    // التصحيح التلقائي للأسئلة الاختيارية فقط
    let score = 0;
    let maxScore = 0;
    quiz.questions.forEach((q, i) => {
      maxScore += q.points;
      if (q.type !== "essay" && normalized[i] === q.correctIndex)
        score += q.points;
    });

    // محاولة + درجة في transaction واحدة؛ تكرار المحاولة يرمي P2002
    // مع وجود أسئلة كتابية تُحفظ المحاولة بانتظار التصحيح اليدوي،
    // وتُنشأ درجة Grade بعد أن يصححها المعلم
    const [attempt] = await prisma.$transaction([
      prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          studentId,
          answers: normalized,
          score,
          maxScore,
          graded: !hasEssay,
        },
      }),
      ...(hasEssay
        ? []
        : [
            prisma.grade.create({
              data: {
                studentId,
                subject: quiz.subject,
                type: "quiz",
                score,
                maxScore,
                note: quiz.title,
              },
            }),
          ]),
    ]);

    return NextResponse.json(
      { id: attempt.id, score, maxScore, graded: !hasEssay },
      { status: 201 }
    );
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "تم تسليم هذا الاختبار مسبقًا" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "فشل في تسليم الاختبار" }, { status: 500 });
  }
}
