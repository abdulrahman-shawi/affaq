import { prisma } from "@/app/lib/prisma";

/** يعيد null إن لم يكن المستخدم مشرفًا (بلا تقييد)، أو مصفوفة معرّفات صفوف المشرف */
export async function getSupervisorClassIds(
  user: { id: string; role: string } | null | undefined
): Promise<string[] | null> {
  if (!user || user.role !== "supervisor") return null;
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { supervisedClasses: { select: { id: true } } },
  });
  return row?.supervisedClasses.map((c) => c.id) ?? [];
}

export interface SupervisorScope {
  classIds: string[];              // كل الصفوف التي يشرف عليها
  classOrders: number[];           // قيم order (الجلسات/الاختبارات/الواجبات تشير إلى grade = ClassLevel.order)
  unrestrictedClassIds: string[];  // صفوف بلا تعيين معلمات — يشرف على كل معلماتها
  restrictedClassIds: string[];    // صفوف لها معلمات معيّنات — يشرف عليهنّ فقط
  restrictedTeacherIds: string[];  // معرّفات المعلمات المعيّنات ضمن الصفوف المقيّدة
  visibleTeacherIds: string[];     // معلمات الصفوف غير المقيّدة + المعلمات المعيّنات
  restrictedSubjectNames: string[];// مواد المعلمات المعيّنات (الدرجات/التسليمات بلا teacherId — المطابقة باسم المادة)
}

/** نطاق المشرف الكامل — null إن لم يكن المستخدم مشرفًا */
export async function getSupervisorScope(
  user: { id: string; role: string } | null | undefined
): Promise<SupervisorScope | null> {
  if (!user || user.role !== "supervisor") return null;

  const [row, assignments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { supervisedClasses: { select: { id: true, order: true } } },
    }),
    prisma.supervisorTeacher.findMany({
      where: { supervisorId: user.id },
      select: { classId: true, teacherId: true },
    }),
  ]);

  const classes = row?.supervisedClasses ?? [];
  const classIds = classes.map((c) => c.id);
  const classOrders = Array.from(new Set(classes.map((c) => c.order)));

  const restrictedClassIds = Array.from(
    new Set(assignments.map((a) => a.classId))
  );
  const unrestrictedClassIds = classIds.filter(
    (id) => !restrictedClassIds.includes(id)
  );
  const restrictedTeacherIds = Array.from(
    new Set(assignments.map((a) => a.teacherId))
  );

  const [unrestrictedTeachers, restrictedTeachers] = await Promise.all([
    prisma.teacher.findMany({
      where: { classes: { some: { id: { in: unrestrictedClassIds } } } },
      select: { id: true },
    }),
    prisma.teacher.findMany({
      where: { id: { in: restrictedTeacherIds } },
      select: { id: true, subjects: { select: { name: true } } },
    }),
  ]);

  const visibleTeacherIds = Array.from(
    new Set([
      ...unrestrictedTeachers.map((t) => t.id),
      ...restrictedTeacherIds,
    ])
  );
  const restrictedSubjectNames = Array.from(
    new Set(
      restrictedTeachers.flatMap((t) => t.subjects.map((s) => s.name))
    )
  );

  return {
    classIds,
    classOrders,
    unrestrictedClassIds,
    restrictedClassIds,
    restrictedTeacherIds,
    visibleTeacherIds,
    restrictedSubjectNames,
  };
}
