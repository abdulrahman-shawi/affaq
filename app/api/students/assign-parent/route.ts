import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// تعيين ولي أمر لطالب أو أكثر — المدخلات: studentIds[], parentId (أو null لإلغاء التعيين)
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser?.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { studentIds, parentId } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "لم يتم تحديد طلاب" }, { status: 400 });
    }

    if (parentId !== null) {
      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "ولي الأمر غير موجود" },
          { status: 404 }
        );
      }
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { parentId },
    });

    return NextResponse.json({ count: result.count });
  } catch {
    return NextResponse.json({ error: "فشل في تعيين ولي الأمر" }, { status: 500 });
  }
}
