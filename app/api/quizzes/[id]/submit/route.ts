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
    if (answers.length !== quiz.questions.length) {
      return NextResponse.json(
        { error: "يجب الإجابة على جميع الأسئلة" },
        { status: 400 }
      );
    }

    // التصحيح التلقائي
    let score = 0;
    let maxScore = 0;
    quiz.questions.forEach((q, i) => {
      maxScore += q.points;
      if (answers[i] === q.correctIndex) score += q.points;
    });

    // محاولة + درجة في transaction واحدة؛ تكرار المحاولة يرمي P2002
    const [attempt] = await prisma.$transaction([
      prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          studentId,
          answers: answers.map(Number),
          score,
          maxScore,
        },
      }),
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
    ]);

    return NextResponse.json(
      { id: attempt.id, score, maxScore },
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
