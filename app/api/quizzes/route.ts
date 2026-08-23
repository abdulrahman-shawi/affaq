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
      // الطالب يرى الاختبارات المنشورة فقط — المسودات للمعلم والمدير
      where: sessionUser.role === "student" ? { published: true } : {},
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
    const { title, subject, grade, teacherId, questions, durationMinutes, published } = body;

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
        type?: string;
        text?: string;
        options?: string[];
        correctIndex?: number;
        points?: number;
      }) => {
        if (!q.text?.trim()) return true;
        if (q.points !== undefined && Number(q.points) <= 0) return true;
        // السؤال الكتابي لا يحتاج خيارات ولا إجابة صحيحة — يصحَّح يدويًا
        if (q.type === "essay") return false;
        if (!Array.isArray(q.options)) return true;
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
        { error: "كل سؤال يحتاج نصًا، والأسئلة الاختيارية تحتاج خيارات مكتملة وإجابة صحيحة محددة" },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        subject,
        grade: Number(grade),
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        published: published !== false,
        teacherId,
        questions: {
          create: questions.map(
            (q: {
              type?: string;
              text: string;
              options: string[];
              correctIndex: number;
              points?: number;
            }) => ({
              type:
                q.type === "truefalse"
                  ? "truefalse"
                  : q.type === "essay"
                    ? "essay"
                    : "mcq",
              text: q.text.trim(),
              options: q.type === "essay" ? [] : q.options.map((o) => o.trim()),
              correctIndex: q.type === "essay" ? -1 : q.correctIndex,
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
