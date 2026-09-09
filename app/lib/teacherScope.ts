import { prisma } from "@/app/lib/prisma";

/** يعيد null إن لم يكن المستخدم معلمًا (بلا تقييد)، أو مصفوفة معرّفات صفوف المعلم */
export async function getTeacherClassIds(
  user: { id: string; role: string } | null | undefined
): Promise<string[] | null> {
  if (!user || user.role !== "teacher") return null;
  const row = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: { classes: { select: { id: true } } },
  });
  return row?.classes.map((c) => c.id) ?? [];
}
