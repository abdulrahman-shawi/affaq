import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isPhoneTaken } from "@/app/lib/phone";

// إدارة المشرفين خاصة بالأدمن وحده — المشرف نفسه لا يصل إليها
async function requireAdmin() {
  const sessionUser = await getSessionUser();
  return sessionUser?.role === "admin" ? sessionUser : null;
}

const supervisorSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  createdAt: true,
  supervisedClasses: {
    select: { id: true, name: true },
    orderBy: { order: "asc" as const },
  },
  supervisedTeachers: {
    select: {
      classId: true,
      teacherId: true,
      teacher: { select: { user: { select: { name: true } } } },
    },
  },
};

function toDTO<
  T extends {
    supervisedClasses: { id: string; name: string }[];
    supervisedTeachers: {
      classId: string;
      teacherId: string;
      teacher: { user: { name: string } };
    }[];
  }
>(supervisor: T) {
  const { supervisedClasses, supervisedTeachers, ...rest } = supervisor;
  return {
    ...rest,
    classes: supervisedClasses,
    teacherAssignments: supervisedTeachers.map((a) => ({
      classId: a.classId,
      teacherId: a.teacherId,
      teacherName: a.teacher.user.name,
    })),
  };
}

// التحقق من تعيينات المعلمات: كل صف ضمن صفوف الإشراف، وكل معلمة تدرّس ذلك الصف
// تعيد مصفوفة التعيينات الجاهزة للحفظ، أو نص خطأ عربي
async function validateTeacherAssignments(
  classIds: unknown,
  teacherAssignments: unknown
): Promise<{ classId: string; teacherId: string }[] | string> {
  if (!Array.isArray(teacherAssignments)) return [];
  const ids = Array.isArray(classIds) ? classIds : [];
  const result: { classId: string; teacherId: string }[] = [];
  for (const a of teacherAssignments) {
    if (typeof a?.classId !== "string" || typeof a?.teacherId !== "string") {
      return "تعيينات المعلمات غير صالحة";
    }
    if (!ids.includes(a.classId)) {
      return "الصف المحدد غير مشمول بإشراف هذا المشرف";
    }
    const teaches = await prisma.teacher.findFirst({
      where: { id: a.teacherId, classes: { some: { id: a.classId } } },
      select: { id: true },
    });
    if (!teaches) return "المعلمة المختارة لا تدرّس الصف المحدد";
    result.push({ classId: a.classId, teacherId: a.teacherId });
  }
  return result;
}

async function findSupervisor(id: string) {
  const supervisor = await prisma.user.findFirst({
    where: { id, role: "supervisor" },
  });
  return supervisor;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const supervisor = await findSupervisor(params.id);
    if (!supervisor) {
      return NextResponse.json({ error: "المشرف غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, password, classIds, teacherAssignments } = body;

    if (!name) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // التعيينات تُتحقق ضد الصفوف الفعلية بعد التعديل — المُرسَلة أو الحالية
    let assignments: { classId: string; teacherId: string }[] | null = null;
    if (Array.isArray(teacherAssignments)) {
      const effectiveClassIds = Array.isArray(classIds)
        ? classIds
        : (
            await prisma.user.findUnique({
              where: { id: params.id },
              select: { supervisedClasses: { select: { id: true } } },
            })
          )?.supervisedClasses.map((c) => c.id) ?? [];
      const validated = await validateTeacherAssignments(
        effectiveClassIds,
        teacherAssignments
      );
      if (typeof validated === "string") {
        return NextResponse.json({ error: validated }, { status: 400 });
      }
      assignments = validated;
    }

    if (email) {
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== supervisor.id) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم مسبقًا" },
          { status: 409 }
        );
      }
    }

    if (phone && (await isPhoneTaken(phone, supervisor.id))) {
      return NextResponse.json(
        { error: "رقم الهاتف مستخدم مسبقًا" },
        { status: 409 }
      );
    }

    const updateData = {
      name,
      email: email || null,
      phone: phone || null,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      ...(Array.isArray(classIds)
        ? {
            supervisedClasses: {
              set: classIds.map((id: string) => ({ id })),
            },
          }
        : {}),
    };

    // التعيينات تُستبدل بالكامل ضمن معاملة واحدة مع تحديث المستخدم
    let updated;
    if (assignments) {
      [, , updated] = await prisma.$transaction([
        prisma.supervisorTeacher.deleteMany({
          where: { supervisorId: params.id },
        }),
        prisma.supervisorTeacher.createMany({
          data: assignments.map((a) => ({
            supervisorId: params.id,
            classId: a.classId,
            teacherId: a.teacherId,
          })),
        }),
        // التحديث أخيرًا حتى تُعاد التعيينات الجديدة ضمن select
        prisma.user.update({
          where: { id: params.id },
          data: updateData,
          select: supervisorSelect,
        }),
      ]);
    } else {
      updated = await prisma.user.update({
        where: { id: params.id },
        data: updateData,
        select: supervisorSelect,
      });
    }

    return NextResponse.json(toDTO(updated));
  } catch {
    return NextResponse.json({ error: "فشل في تعديل المشرف" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const supervisor = await findSupervisor(params.id);
    if (!supervisor) {
      return NextResponse.json({ error: "المشرف غير موجود" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: params.id } }),
      prisma.user.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل في حذف المشرف" }, { status: 500 });
  }
}
