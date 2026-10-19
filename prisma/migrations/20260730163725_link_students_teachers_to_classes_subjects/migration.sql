-- AlterTable: إضافة العمود الجديد قبل نقل البيانات
ALTER TABLE "Student" ADD COLUMN "classId" TEXT;

-- CreateTable: جداول الربط many-to-many للمعلم
CREATE TABLE "_ClassLevelToTeacher" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassLevelToTeacher_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE TABLE "_SubjectToTeacher" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubjectToTeacher_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ClassLevelToTeacher_B_index" ON "_ClassLevelToTeacher"("B");
CREATE INDEX "_SubjectToTeacher_B_index" ON "_SubjectToTeacher"("B");

-- AddForeignKey
ALTER TABLE "_ClassLevelToTeacher" ADD CONSTRAINT "_ClassLevelToTeacher_A_fkey" FOREIGN KEY ("A") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ClassLevelToTeacher" ADD CONSTRAINT "_ClassLevelToTeacher_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_SubjectToTeacher" ADD CONSTRAINT "_SubjectToTeacher_A_fkey" FOREIGN KEY ("A") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_SubjectToTeacher" ADD CONSTRAINT "_SubjectToTeacher_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- نقل البيانات الحالية قبل حذف الأعمدة القديمة
-- 1) إنشاء الصفوف الثمانية الافتراضية (لا تتعارض مع أي صفوف أُنشئت يدويًا)
INSERT INTO "ClassLevel" ("id", "name", "order", "createdAt") VALUES
    (gen_random_uuid()::text, 'الصف الأول', 1, NOW()),
    (gen_random_uuid()::text, 'الصف الثاني', 2, NOW()),
    (gen_random_uuid()::text, 'الصف الثالث', 3, NOW()),
    (gen_random_uuid()::text, 'الصف الرابع', 4, NOW()),
    (gen_random_uuid()::text, 'الصف الخامس', 5, NOW()),
    (gen_random_uuid()::text, 'الصف السادس', 6, NOW()),
    (gen_random_uuid()::text, 'الصف السابع', 7, NOW()),
    (gen_random_uuid()::text, 'الصف الثامن', 8, NOW())
ON CONFLICT ("name") DO NOTHING;

-- 2) ربط الطلاب الحاليين بصفوفهم حسب رقم الصف القديم
UPDATE "Student" st SET "classId" = (
    SELECT c."id" FROM "ClassLevel" c
    WHERE c."order" = st."grade"
    ORDER BY c."createdAt"
    LIMIT 1
);

-- 3) ربط المعلمين بصفوفهم حسب مصفوفة grades القديمة
INSERT INTO "_ClassLevelToTeacher" ("A", "B")
SELECT DISTINCT c."id", t."id"
FROM "Teacher" t
JOIN "ClassLevel" c ON c."order" = ANY(t."grades")
ON CONFLICT DO NOTHING;

-- 4) إنشاء مواد من نصوص subjects القديمة لدى المعلمين
INSERT INTO "Subject" ("id", "name", "createdAt")
SELECT DISTINCT gen_random_uuid()::text, TRIM(u), NOW()
FROM "Teacher" t, unnest(t."subjects") AS u
WHERE TRIM(u) <> ''
ON CONFLICT ("name") DO NOTHING;

-- 5) ربط المعلمين بموادهم
INSERT INTO "_SubjectToTeacher" ("A", "B")
SELECT DISTINCT s."id", t."id"
FROM "Teacher" t
JOIN "Subject" s ON s."name" = ANY(ARRAY(SELECT TRIM(u) FROM unnest(t."subjects") AS u))
ON CONFLICT DO NOTHING;

-- AlterTable: حذف الأعمدة القديمة بعد نقل بياناتها
ALTER TABLE "Student" DROP COLUMN "grade";
ALTER TABLE "Teacher" DROP COLUMN "grades";
ALTER TABLE "Teacher" DROP COLUMN "subjects";

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
