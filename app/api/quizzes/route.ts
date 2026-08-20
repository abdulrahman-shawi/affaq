import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        teacher: { include: { user: true } },
        questions: true,
        attempts: { include: { student: { include: { user: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // الطالب لا يحصل على correctIndex إلا للاختبارات التي أدّاها (للمراجعة)
    if (sessionUser.role === "student") {
      return NextResponse.json(
        quizzes.map((quiz) => {
          const myAttempts = quiz.attempts.filter(
            (a) => a.student.userId === sessionUser.id
          );
          const attempted = myAttempts.length > 0;
          return {
            ...quiz,
            attempts: myAttempts,
            questions: attempted
              ? quiz.questions
              : quiz.questions.map(({ correctIndex: _c, ...q }) => q),
          };
        })
      );
    }

    return NextResponse.json(quizzes);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الاختبارات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, subject, grade, teacherId, questions, durationMinutes } = body;

    if (
      !title?.trim() ||
      !subject ||
      !grade ||
      !teacherId ||
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

    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        subject,
        grade: Number(grade),
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        teacherId,
        questions: {
          create: questions.map(
            (q: {
              text: string;
              options: string[];
              correctIndex: number;
              points?: number;
            }) => ({
              text: q.text.trim(),
              options: q.options.map((o) => o.trim()),
              correctIndex: q.correctIndex,
              points: q.points !== undefined ? Number(q.points) : 1,
            })
          ),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء الاختبار" }, { status: 500 });
  }
}
