import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { notifyGradeStudentsAndParents } from "@/app/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // الطالب يرى واجبات صفّه فقط (grade = ClassLevel.order المخزّن،
    // ويشمل فرق الدوام المسائي +100)
    let where: { grade: number } | undefined;
    let submissionsInclude: true | { where: { studentId: string } } = true;
    if (sessionUser.role === "student") {
      const student = await prisma.student.findUnique({
        where: { userId: sessionUser.id },
        select: { id: true, class: { select: { order: true } } },
      });
      if (!student?.class) {
        return NextResponse.json([]);
      }
      where = { grade: student.class.order };
      // لا نُرجع تسليمات الزملاء — تسليم الطالب نفسه فقط
      submissionsInclude = { where: { studentId: student.id } };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: { submissions: submissionsInclude },
      orderBy: { dueDate: "asc" },
    });

    // نرفق اسم الصف لكل واجب — يعرض للمعلم اسم الصف بدل رقمه
    // حتى لو لم يكن الصف ضمن صفوفه المسندة (قائمة /api/classes محصورة بصفوفه)
    // dedupe بدون Set spread لتوافق target القديم في tsconfig
    const grades = assignments
      .map((a) => a.grade)
      .filter((g, i, arr) => arr.indexOf(g) === i);
    const classLevels = grades.length
      ? await prisma.classLevel.findMany({
          where: { order: { in: grades } },
          select: { order: true, name: true },
        })
      : [];
    const nameByOrder = new Map(classLevels.map((c) => [c.order, c.name]));
    const result = assignments.map((a) => ({
      ...a,
      className: nameByOrder.get(a.grade) ?? null,
    }));

    return NextResponse.json(result);
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

    // قد يكون grade = 0 (ترتيب صف "الروضة") — لا نستخدم !grade
    if (
      !title ||
      !subject ||
      grade === undefined ||
      grade === null ||
      grade === "" ||
      !dueDate
    ) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // نسجّل المعلم المنشئ ليصله إشعار عند تسليم الطلاب
    let teacherId: string | null = null;
    if (sessionUser.role === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: sessionUser.id },
        select: { id: true },
      });
      teacherId = teacher?.id ?? null;
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        subject,
        grade: Number(grade),
        dueDate: new Date(dueDate),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        teacherId,
      },
    });

    // إشعار طلاب الصف وأولياء أمورهم بالواجب الجديد
    await notifyGradeStudentsAndParents(Number(grade), {
      title: "واجب جديد",
      body: `${subject}: ${title} — موعد التسليم ${new Date(dueDate).toLocaleDateString("ar")}`,
      type: "assignment",
      link: "/dashboard/student/assignments",
      parentLink: "/dashboard/parent/children",
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء الواجب" }, { status: 500 });
  }
}
