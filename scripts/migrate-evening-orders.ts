import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { EVENING_ORDER_OFFSET } from "../app/lib/classOrder";

// ترحيل لمرة واحدة:
// 1) توحيد قيم الدوام المخزّنة بالعربية ("صباحي"/"مسائي") إلى صيغة الكود ("morning"/"evening")
//    في جدولي الصفوف والمعلمين.
// 2) إضافة فرق ثابت (100) لترتيب الصفوف المسائية، لأن ترتيبها كان مطابقًا للصباحية
//    فيُخلط الحضور والحصص والواجبات بين الدوامين.
// السكربت idempotent — إعادة تشغيله لا تغيّر شيئًا بعد أول نجاح.

const SHIFT_MAP: Record<string, string> = {
  صباحي: "morning",
  مسائي: "evening",
  morning: "morning",
  evening: "evening",
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function normalizeShifts() {
  const classRows = await prisma.classLevel.findMany({
    select: { id: true, shift: true },
  });
  let fixed = 0;
  for (const row of classRows) {
    if (row.shift && SHIFT_MAP[row.shift] && SHIFT_MAP[row.shift] !== row.shift) {
      await prisma.classLevel.update({
        where: { id: row.id },
        data: { shift: SHIFT_MAP[row.shift] },
      });
      fixed++;
    }
  }
  console.log(`✔ توحيد الدوام في الصفوف: ${fixed} سجل`);

  const teacherRows = await prisma.teacher.findMany({
    select: { id: true, shift: true },
  });
  fixed = 0;
  for (const row of teacherRows) {
    if (row.shift && SHIFT_MAP[row.shift] && SHIFT_MAP[row.shift] !== row.shift) {
      await prisma.teacher.update({
        where: { id: row.id },
        data: { shift: SHIFT_MAP[row.shift] },
      });
      fixed++;
    }
  }
  console.log(`✔ توحيد الدوام في المعلمين: ${fixed} سجل`);
}

async function offsetEveningOrders() {
  const eveningClasses = await prisma.classLevel.findMany({
    where: { shift: "evening" },
  });

  let migrated = 0;
  let skipped = 0;
  for (const c of eveningClasses) {
    if (c.order >= EVENING_ORDER_OFFSET) {
      skipped++; // مُرحّل مسبقًا
      continue;
    }
    const next = c.order + EVENING_ORDER_OFFSET;
    const conflict = await prisma.classLevel.findFirst({
      where: { order: next, NOT: { id: c.id } },
    });
    if (conflict) {
      console.warn(
        `✗ تخطي "${c.name}" — الترتيب ${next} مستخدم من صف "${conflict.name}"`
      );
      continue;
    }
    await prisma.classLevel.update({
      where: { id: c.id },
      data: { order: next },
    });
    console.log(`✔ "${c.name}": ${c.order} ← ${next}`);
    migrated++;
  }

  console.log(`تم ترحيل ${migrated} صفًا مسائيًا (تخطي ${skipped} مُرحّل مسبقًا).`);
  console.log(
    "ملاحظة: الحصص والواجبات والاختبارات القديمة المسجلة برقم الصف القديم تبقى كما هي — ستطابق من الآن فصاعدًا الصفوف الصباحية في سجلاتها التاريخية فقط."
  );
}

async function main() {
  await normalizeShifts();
  await offsetEveningOrders();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
