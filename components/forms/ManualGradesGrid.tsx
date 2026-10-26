"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import type {
  ClassLevelDTO,
  GradeDTO,
  StudentDTO,
  TeacherDTO,
} from "@/types";

const GRADE_TYPES = [
  { value: "manual", label: "تسميع" },
  { value: "dictation", label: "إملاء" },
  { value: "memorization", label: "مذاكرة" },
  { value: "exam", label: "اختبار" },
  { value: "quiz", label: "اختبار قصير" },
  { value: "homework", label: "واجب" },
];

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * شبكة إضافة درجات شبيهة بـ Excel: الصفوف طلاب الصف، والأعمدة موادّه.
 * لكل مادة درجة عظمى في رأس العمود، والنوع موحّد للشبكة من قائمة فوقها،
 * وعمود «ملاحظات» يرفع ملاحظة الطالب ويُرفقها بكل درجة معبّأة له.
 * الحفظ يرسل الخلايا غير الفارغة دفعة واحدة إلى POST /api/grades/bulk،
 * وإعادة الرصد لنفس (طالب، مادة، نوع) تحدّث السجل بدل تكراره.
 */
export default function ManualGradesGrid() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [grades, setGrades] = useState<GradeDTO[]>([]);
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState("");
  const [type, setType] = useState("manual");
  // نصوص خام لإتاحة الإفراغ أثناء الكتابة: studentId → subject → الدرجة
  const [cells, setCells] = useState<Record<string, Record<string, string>>>({});
  // ملاحظة لكل طالب — تُرفق بكل درجة معبّأة لنفس الطالب عند الحفظ
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [maxScores, setMaxScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchGrades = useCallback(async () => {
    try {
      const res = await fetch("/api/grades");
      setGrades(res.ok ? await res.json() : []);
    } catch {
      setGrades([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [classesRes, studentsRes, gradesRes, teachersRes] =
          await Promise.all([
            fetch("/api/classes"),
            fetch("/api/students"),
            fetch("/api/grades"),
            fetch("/api/teachers"),
          ]);
        setClasses(classesRes.ok ? await classesRes.json() : []);
        setStudents(studentsRes.ok ? await studentsRes.json() : []);
        setGrades(gradesRes.ok ? await gradesRes.json() : []);
        setTeachers(teachersRes.ok ? await teachersRes.json() : []);
      } catch {
        setClasses([]);
        setStudents([]);
        setGrades([]);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedClass = classes.find((c) => c.id === classId);
  // أعمدة الشبكة = مواد المعلم المرتبطة به فقط، لا كل مواد الصف —
  // نطابِق معرّفات مواده مع مواد الصف المختار
  const teacherSubjectIds = useMemo(() => {
    if (!user) return null;
    const me = teachers.find((t) => t.userId === user.id);
    return new Set((me?.subjects ?? []).map((s) => s.id));
  }, [teachers, user]);
  const classSubjects = useMemo(
    () =>
      (selectedClass?.subjects ?? []).filter(
        (s) => teacherSubjectIds === null || teacherSubjectIds.has(s.id)
      ),
    [selectedClass, teacherSubjectIds]
  );
  const classStudents = useMemo(
    () => students.filter((s) => s.classId === classId),
    [students, classId]
  );

  // تعبئة مبدئية من الدرجات المحفوظة لنفس النوع عند تغيّر الصف أو النوع أو بعد الحفظ
  useEffect(() => {
    if (!classId) {
      setCells({});
      setMaxScores({});
      setNotes({});
      return;
    }
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    const nextCells: Record<string, Record<string, string>> = {};
    const nextMax: Record<string, string> = {};
    const nextNotes: Record<string, string> = {};
    for (const g of grades) {
      if (g.type !== type || !classStudentIds.has(g.studentId)) continue;
      (nextCells[g.studentId] ??= {})[g.subject] = String(g.score);
      if (!(g.subject in nextMax)) nextMax[g.subject] = String(g.maxScore);
      if (g.note && !(g.studentId in nextNotes)) nextNotes[g.studentId] = g.note;
    }
    setCells(nextCells);
    setMaxScores(nextMax);
    setNotes(nextNotes);
    setError(null);
  }, [classId, type, grades, classStudents]);

  const maxFor = (subject: string) => {
    const raw = maxScores[subject];
    const n = Number(raw);
    return raw !== undefined && Number.isFinite(n) && n > 0 ? n : 100;
  };

  const filledCount = useMemo(
    () =>
      Object.values(cells).reduce(
        (sum, row) => sum + Object.values(row).filter((v) => v.trim() !== "").length,
        0
      ),
    [cells]
  );

  function setCell(studentId: string, subject: string, value: string) {
    setCells((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subject]: value },
    }));
  }

  // تنقّل شبكي: Enter/السهم للأسفل ينقل للخلية أدناه، والسهم للأعلى للخلية أعلاه
  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) {
    if (e.key !== "Enter" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? -1 : 1;
    const next = document.querySelector<HTMLInputElement>(
      `input[data-grade-row="${rowIndex + delta}"][data-grade-col="${colIndex}"]`
    );
    next?.focus();
    next?.select();
  }

  async function handleSave() {
    setError(null);
    const entries = [];
    for (const student of classStudents) {
      for (const subject of classSubjects) {
        const raw = cells[student.id]?.[subject.name];
        if (raw === undefined || raw.trim() === "") continue;
        const score = Number(raw);
        const maxScore = maxFor(subject.name);
        if (!Number.isFinite(score) || score < 0 || score > maxScore) {
          setError(
            `درجة الطالب ${student.user?.name ?? ""} في ${subject.name} يجب أن تكون بين 0 و ${maxScore}`
          );
          return;
        }
        entries.push({
          studentId: student.id,
          subject: subject.name,
          type,
          score,
          maxScore,
          note: notes[student.id] ?? "",
        });
      }
    }
    if (entries.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/grades/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, entries }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "فشل في حفظ الدرجات");
      toast({
        variant: "success",
        title: `تم حفظ ${body.count} درجة`,
      });
      await refetchGrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">الصف</label>
          <select
            className={selectClassName}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={loading}
          >
            <option value="">اختر الصف</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">نوع الدرجة</label>
          <select
            className={selectClassName}
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={loading}
          >
            {GRADE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleSave}
          disabled={!classId || filledCount === 0 || saving}
          className="ms-auto"
        >
          <Save className="h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : `حفظ (${filledCount})`}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !classId && (
        <p className="text-sm text-muted-foreground">
          اختر الصف لعرض شبكة الرصد — الصفوف المعروضة هي صفوفك المرتبطة بحسابك.
        </p>
      )}

      {classId && classSubjects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          لا توجد مواد مرتبطة بهذا الصف — تواصل مع الإدارة لربط المواد.
        </p>
      )}

      {classId && classSubjects.length > 0 && classStudents.length === 0 && (
        <p className="text-sm text-muted-foreground">
          لا يوجد طلاب مسجلون في هذا الصف.
        </p>
      )}

      {classId && classSubjects.length > 0 && classStudents.length > 0 && (
        <>
          <div className="overflow-auto rounded-md border max-h-[70vh]">
            {/* table مباشرة بدل مكوّن Table كي لا يتداخل غلافاه مع التمرير،
                وborder-separate لأن border-collapse الافتراضي يعطّل sticky */}
            <table className="w-full caption-bottom text-sm border-separate border-spacing-0 min-w-max">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky right-0 top-0 z-20 bg-background min-w-40">
                    الطالب
                  </TableHead>
                  {classSubjects.map((subject) => (
                    <TableHead
                      key={subject.id}
                      className="sticky top-0 z-10 min-w-32 border-s border-border bg-background text-center"
                    >
                      <div className="space-y-1">
                        <div>{subject.name}</div>
                        <div className="flex items-center justify-center gap-1 text-xs font-normal text-muted-foreground">
                          <span>من</span>
                          <Input
                            type="number"
                            min={1}
                            className="h-7 w-16 px-2 text-center"
                            value={maxScores[subject.name] ?? "100"}
                            onChange={(e) =>
                              setMaxScores((prev) => ({
                                ...prev,
                                [subject.name]: e.target.value,
                              }))
                            }
                            aria-label={`الدرجة العظمى لمادة ${subject.name}`}
                          />
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="top-0 z-20 min-w-32 border-s border-border bg-background text-center lg:sticky lg:left-0 lg:min-w-44">
                    ملاحظات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map((student, rowIndex) => (
                  <TableRow key={student.id} className="hover:bg-transparent">
                    <TableCell className="sticky right-0 z-10 min-w-40 bg-background font-medium">
                      {student.user?.name ?? "—"}
                    </TableCell>
                    {classSubjects.map((subject, colIndex) => (
                      <TableCell
                        key={subject.id}
                        className="border-s border-border p-1 text-center"
                      >
                        <Input
                          type="number"
                          min={0}
                          max={maxFor(subject.name)}
                          step="any"
                          inputMode="decimal"
                          data-grade-row={rowIndex}
                          data-grade-col={colIndex}
                          className="h-8 w-full min-w-20 border-transparent bg-transparent text-center shadow-none hover:border-input focus:border-input"
                          value={cells[student.id]?.[subject.name] ?? ""}
                          onChange={(e) =>
                            setCell(student.id, subject.name, e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, colIndex)
                          }
                          aria-label={`درجة ${student.user?.name ?? ""} في ${subject.name}`}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="z-10 min-w-32 border-s border-border bg-background p-1 lg:sticky lg:left-0 lg:min-w-44">
                      <Input
                        value={notes[student.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [student.id]: e.target.value,
                          }))
                        }
                        placeholder="ملاحظة (اختياري)"
                        aria-label={`ملاحظة ${student.user?.name ?? ""}`}
                        className="h-8"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            الخلايا الفارغة لا تُغيّر شيئًا عند الحفظ — اكتب الدرجة ثم Enter
            للانتقال للطالب التالي. إعادة الرصد لنفس النوع تحدّث الدرجة السابقة،
            وتُرفق الملاحظة المكتوبة في عمود «ملاحظات» بكل درجة معبّأة لنفس
            الطالب.
          </p>
        </>
      )}
    </div>
  );
}
