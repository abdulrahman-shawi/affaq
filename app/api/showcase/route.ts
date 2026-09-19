import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// صفحة نجوم الأكاديمية — منشورات تميّز الطلاب (صورة أو فيديو)
// العرض لجميع الأدوار، والإضافة للمدير والمشرف والمعلم فقط

const UPLOAD_ROLES = ["admin", "supervisor", "teacher"];

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const posts = await prisma.showcasePost.findMany({
      include: {
        student: { include: { user: true, class: true } },
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      posts.map((p) => ({
        id: p.id,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        caption: p.caption,
        createdAt: p.createdAt,
        studentId: p.studentId,
        studentName: p.student.user.name,
        className: p.student.class?.name ?? null,
        createdById: p.createdById,
        createdByName: p.createdBy.name,
      }))
    );
  } catch {
    return NextResponse.json({ error: "فشل في تحميل المنشورات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !UPLOAD_ROLES.includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, mediaUrl, mediaType, caption } = body;

    if (!studentId || !mediaUrl || !["image", "video"].includes(mediaType)) {
      return NextResponse.json({ error: "بيانات ناقصة أو غير صحيحة" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
    }

    const post = await prisma.showcasePost.create({
      data: {
        studentId,
        mediaUrl,
        mediaType,
        caption: caption?.trim() || null,
        createdById: sessionUser.id,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إضافة المنشور" }, { status: 500 });
  }
}
