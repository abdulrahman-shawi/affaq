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

    const classes = await prisma.classLevel.findMany({
      include: { subjects: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(classes);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الصفوف" }, { status: 500 });
  }
}

// إضافة صف — يمكن ربطه بمواد موجودة عبر subjectIds
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { name, order, shift, subjectIds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "اسم الصف مطلوب" }, { status: 400 });
    }

    const existing = await prisma.classLevel.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "اسم الصف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const classLevel = await prisma.classLevel.create({
      data: {
        name: name.trim(),
        order: Number.isInteger(Number(order)) ? Number(order) : 0,
        shift: shift === "morning" || shift === "evening" ? shift : null,
        ...(Array.isArray(subjectIds) && subjectIds.length > 0
          ? { subjects: { connect: subjectIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: { subjects: true },
    });

    return NextResponse.json(classLevel, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة الصف" }, { status: 500 });
  }
}
