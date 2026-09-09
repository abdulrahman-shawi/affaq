import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorScope } from "@/app/lib/supervisorScope";
import { notifyUser } from "@/app/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const scope = await getSupervisorScope(sessionUser);

    const submissions = await prisma.submission.findMany({
      where: scope
        ? {
            OR: [
              {
                student: { classId: { in: scope.unrestrictedClassIds } },
              },
              {
                student: { classId: { in: scope.restrictedClassIds } },
                assignment: {
                  subject: { in: scope.restrictedSubjectNames },
                },
              },
            ],
          }
        : undefined,
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
      include: {
        student: { include: { user: true } },
        assignment: { include: { teacher: true } },
      },
    });

    // إشعار المعلم صاحب الواجب بالتسليم
    // الواجبات القديمة بلا معلم: نُشعِر معلمي صفوف نفس المرحلة
    const teacherUserIds: string[] = [];
    if (submission.assignment.teacher) {
      teacherUserIds.push(submission.assignment.teacher.userId);
    } else {
      const teachers = await prisma.teacher.findMany({
        where: { classes: { some: { order: submission.assignment.grade } } },
        select: { userId: true },
      });
      teacherUserIds.push(...teachers.map((t) => t.userId));
    }
    for (const userId of teacherUserIds) {
      if (userId === sessionUser.id) continue;
      await notifyUser(userId, {
        title: "تسليم واجب",
        body: `الطالب ${submission.student.user.name} سلّم واجب «${submission.assignment.title}»`,
        type: "assignment",
        link: "/dashboard/teacher/submissions",
      });
    }

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
    const { id, grade, feedback, maxScore } = body;

    if (!id || grade === undefined) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const existing = await prisma.submission.findUnique({
      where: { id },
      include: { assignment: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "التسليم غير موجود" }, { status: 404 });
    }

    const score = Number(grade);
    const max = Number(maxScore) > 0 ? Number(maxScore) : 100;
    if (!Number.isFinite(score) || score < 0 || score > max) {
      return NextResponse.json(
        { error: "الدرجة يجب أن تكون بين 0 والدرجة العظمى" },
        { status: 400 }
      );
    }

    const [submission] = await prisma.$transaction([
      prisma.submission.update({
        where: { id },
        data: { grade: score, feedback: feedback || null },
        include: { student: { include: { user: true } }, assignment: true },
      }),
      // تقييم الواجب يظهر في صفحة الدرجات — upsert يحدّث السجل عند إعادة التقييم بدل تكراره
      prisma.grade.upsert({
        where: { submissionId: id },
        create: {
          studentId: existing.studentId,
          subject: existing.assignment.subject,
          type: "homework",
          score,
          maxScore: max,
          note: existing.assignment.title,
          submissionId: id,
        },
        update: { score, maxScore: max },
      }),
    ]);

    return NextResponse.json(submission);
  } catch {
    return NextResponse.json({ error: "فشل في تقييم التسليم" }, { status: 500 });
  }
}
