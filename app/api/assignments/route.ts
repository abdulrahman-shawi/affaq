import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assignments = await prisma.assignment.findMany({
      include: { submissions: true },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(assignments);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الواجبات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { title, subject, grade, dueDate, fileUrl, fileName } = body;

    if (!title || !subject || !grade || !dueDate) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        subject,
        grade: Number(grade),
        dueDate: new Date(dueDate),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء الواجب" }, { status: 500 });
  }
}
