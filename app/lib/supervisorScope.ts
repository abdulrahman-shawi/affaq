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
