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
    if (sessionUser.role === "student") {
      return NextResponse.json({
        ...quiz,
        attempts: quiz.attempts.filter(
          (a) => a.student.userId === sessionUser.id
        ),
        questions: quiz.questions.map(({ correctIndex: _c, ...q }) => q),
      });
    }

    return NextResponse.json(quiz);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الاختبار" }, { status: 500 });
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
