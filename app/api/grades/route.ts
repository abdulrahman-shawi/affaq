import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    const grades = await prisma.grade.findMany({
      where: studentId ? { studentId } : undefined,
      include: { student: { include: { user: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(grades);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الدرجات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, subject, type, score, maxScore, note } = body;

    if (!studentId || !subject || !type || score === undefined || !maxScore) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const grade = await prisma.grade.create({
      data: {
        studentId,
        subject,
        type,
        score: Number(score),
        maxScore: Number(maxScore),
        note: note || null,
      },
      include: { student: { include: { user: true } } },
    });

    return NextResponse.json(grade, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في رصد الدرجة" }, { status: 500 });
  }
}
