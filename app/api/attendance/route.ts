import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorClassIds, getSupervisorScope } from "@/app/lib/supervisorScope";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const scope = await getSupervisorScope(sessionUser);

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const studentId = searchParams.get("studentId");

    const attendance = await prisma.attendance.findMany({
      where: {
        ...(sessionId ? { sessionId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(scope
          ? {
              session: {
                teacherId: { in: scope.visibleTeacherIds },
                grade: { in: scope.classOrders },
              },
            }
          : {}),
      },
      include: {
        student: { include: { user: true } },
        session: true,
      },
      orderBy: { session: { date: "desc" } },
    });
    return NextResponse.json(attendance);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الحضور" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (
      !sessionUser ||
      !["admin", "teacher", "supervisor"].includes(sessionUser.role)
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const scoped = await getSupervisorClassIds(sessionUser);

    const body = await req.json();
    const { sessionId, studentId, status, note, records } = body;

    // المشرف يسجّل حضور طلاب صفوفه فقط
    if (scoped) {
      const ids = Array.isArray(records)
        ? records
            .map((r: { studentId?: string }) => r.studentId)
            .filter((id): id is string => Boolean(id))
        : studentId
          ? [studentId]
          : [];
      if (ids.length > 0) {
        const students = await prisma.student.findMany({
          where: { id: { in: ids } },
          select: { classId: true },
        });
        const outsideScope = students.some(
          (s) => !s.classId || !scoped.includes(s.classId)
        );
        if (outsideScope || students.length !== ids.length) {
          return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
        }
      }
    }

    // تسجيل جماعي: استبدال سجلات الحصة بالكامل (لشاشة تسجيل حضور الصف)
    if (sessionId && Array.isArray(records)) {
      const data = records
        .filter((r: { studentId?: string; status?: string }) => r.studentId && r.status)
        .map((r: { studentId: string; status: string; note?: string }) => ({
          sessionId,
          studentId: r.studentId,
          status: r.status,
          note: r.note || null,
        }));
      const [, created] = await prisma.$transaction([
        prisma.attendance.deleteMany({ where: { sessionId } }),
        prisma.attendance.createMany({ data }),
      ]);
      return NextResponse.json({ count: created.count }, { status: 201 });
    }

    if (!sessionId || !studentId || !status) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const attendance = await prisma.attendance.create({
      data: { sessionId, studentId, status, note: note || null },
      include: { student: { include: { user: true } }, session: true },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في تسجيل الحضور" }, { status: 500 });
  }
}
