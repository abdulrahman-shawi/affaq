import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminAreaRole } from "@/app/lib/roles";

export const dynamic = "force-dynamic";

// حذف منشور تميّز — المدير والمشرف يحذفان أي منشور، والمعلم منشوراته فقط
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const post = await prisma.showcasePost.findUnique({
      where: { id: params.id },
    });
    if (!post) {
      return NextResponse.json({ error: "المنشور غير موجود" }, { status: 404 });
    }

    const canDelete =
      isAdminAreaRole(sessionUser.role) ||
      (sessionUser.role === "teacher" && post.createdById === sessionUser.id);
    if (!canDelete) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    await prisma.showcasePost.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف المنشور" }, { status: 500 });
  }
}
