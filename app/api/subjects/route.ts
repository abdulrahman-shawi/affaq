import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      include: { classes: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(subjects);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل المواد" }, { status: 500 });
  }
}

// إضافة مادة — يمكن ربطها بصفوف موجودة عبر classIds
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { name, classIds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "اسم المادة مطلوب" }, { status: 400 });
    }

    const existing = await prisma.subject.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "اسم المادة مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        ...(Array.isArray(classIds) && classIds.length > 0
          ? { classes: { connect: classIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: { classes: true },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة المادة" }, { status: 500 });
  }
}
