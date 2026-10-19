import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// حالة الطالب المسجل دخوله — يستخدمها الحارس لمنع الطلاب غير النشطين
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "student") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const student = await prisma.student.findUnique({
    where: { userId: sessionUser.id },
    select: { status: true },
  });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  return NextResponse.json(student);
}
