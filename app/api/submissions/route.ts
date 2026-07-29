import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        student: { include: { user: true } },
        assignment: true,
      },
      orderBy: { submittedAt: "desc" },
    });
    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل التسليمات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const { assignmentId, studentId, fileUrl, text } = body;

    if (!assignmentId || !studentId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        fileUrl: fileUrl || null,
        text: text || null,
      },
      include: { student: { include: { user: true } }, assignment: true },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في تسليم الواجب" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { id, grade, feedback } = body;

    if (!id || grade === undefined) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: { grade: Number(grade), feedback: feedback || null },
      include: { student: { include: { user: true } }, assignment: true },
    });

    return NextResponse.json(submission);
  } catch {
    return NextResponse.json({ error: "فشل في تقييم التسليم" }, { status: 500 });
  }
}
