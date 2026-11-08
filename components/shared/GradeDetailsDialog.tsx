"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/app/lib/utils";
import { gradeDisplayName, gradeTypeLabels } from "@/app/lib/gradeGroups";
import type { GradeDTO } from "@/types";

// ملخص مادة واحدة في ملف الطالب — يُمرر من صفحة الطالب
export interface SubjectReportRow {
  subject: string;
  count: number;
  /** متوسط نسب الطالب في المادة — null إن لم توجد درجات مدرجة */
  average: number | null;
}

interface CellEntry {
  id: string;
  score: number;
  maxScore: number;
  /** درجة مولّدة من تسليم واجب — تُعدّل من صفحة التسليمات فقط */
  locked: boolean;
}

interface GradeRow {
  studentId: string;
  studentName: string;
  className: string | null;
  cells: Map<string, CellEntry>;
  note: string | null;
}

// عرض ملف الدرجة بنفس تصميم شبكة الرصد (إضافة درجة): الصفوف طلاب الملف،
// والأعمدة موادّه مع الدرجة العظمى في رأس كل مادة، والخلايا درجات الطلاب،
// وعمود أخير للملاحظات. وضع editable (لوحة المعلم/الإدارة) يضيف زر تعديل
// أسفل ملاحظة كل طالب — تتحول عنده خلايا درجاته إلى حقول إدخال ويُحفظ عبر
// PATCH /api/grades. درجات التسليمات (المقفلة) تبقى للقراءة وتُدار من
// صفحة التسليمات
export default function GradeDetailsDialog({
  grade,
  items,
  subjectsReport,
  trigger,
  editable = false,
  onChanged,
}: {
  grade: GradeDTO;
  /** كل سجلات ملف الدرجة — سجل واحد للدرجات الفردية */
  items: GradeDTO[];
  /** ملف مواد الصف ودرجاتها — يُمرر من صفحة الطالب */
  subjectsReport?: SubjectReportRow[];
  trigger?: React.ReactNode;
  /** إظهار زر تعديل درجات كل طالب — للمعلم والإدارة فقط */
  editable?: boolean;
  /** يُستدعى بعد نجاح التعديل لتحديث الجدول في الصفحة */
  onChanged?: () => void;
}) {
  const [localItems, setLocalItems] = useState(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** مسودة التعديل: مادة → نص الدرجة الجديدة */
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // أي تحديث للبيانات من الخارج (بعد الحفظ مثلًا) يعيد مزامنة العرض ويلغي التعديل
  useEffect(() => {
    setLocalItems(items);
    setEditingId(null);
    setError(null);
  }, [items]);

  const name = gradeDisplayName(grade);
  // ملف جماعي (عدة طلاب) — نعرض سطر معلومات مختصرًا فوق الشبكة
  const multi = items.length > 1;

  // أعمدة الشبكة = مواد الملف بترتيب ظهورها، مع الدرجة العظمى لكل مادة
  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of localItems) {
      if (!map.has(g.subject)) map.set(g.subject, g.maxScore);
    }
    return Array.from(map, ([subject, maxScore]) => ({ subject, maxScore }));
  }, [localItems]);

  // صفوف الشبكة = طلاب الملف — خلايا كل طالب: مادة → درجتها، مع ملاحظته
  const rows = useMemo<GradeRow[]>(() => {
    const map = new Map<string, GradeRow>();
    for (const g of localItems) {
      let row = map.get(g.studentId);
      if (!row) {
        row = {
          studentId: g.studentId,
          studentName: g.student?.user?.name ?? "—",
          className: g.student?.class?.name ?? null,
          cells: new Map(),
          note: null,
        };
        map.set(g.studentId, row);
      }
      row.cells.set(g.subject, {
        id: g.id,
        score: g.score,
        maxScore: g.maxScore,
        locked: !!g.submissionId,
      });
      if (!row.note && g.note?.trim()) row.note = g.note;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName, "ar")
    );
  }, [localItems]);

  function startEdit(row: GradeRow) {
    const next: Record<string, string> = {};
    // forEach بدل for..of — target قديم لا يدعم تكرار Map مباشرة
    row.cells.forEach((cell, subject) => {
      if (!cell.locked) next[subject] = String(cell.score);
    });
    setDraft(next);
    setDraftNote(row.note ?? "");
    setEditingId(row.studentId);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveRow(row: GradeRow) {
    // تحقق من كل الدرجات قبل الإرسال
    for (const subject of Object.keys(draft)) {
      const cell = row.cells.get(subject);
      if (!cell) continue;
      const n = Number(draft[subject]);
      if (!Number.isFinite(n) || n < 0 || n > cell.maxScore) {
        setError(`درجة ${subject} يجب أن تكون بين 0 و ${cell.maxScore}`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const note = draftNote.trim() || null;
      const updated: GradeDTO[] = [];
      for (const subject of Object.keys(draft)) {
        const cell = row.cells.get(subject);
        if (!cell) continue;
        const res = await fetch("/api/grades", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: cell.id,
            score: Number(draft[subject]),
            maxScore: cell.maxScore,
            note,
          }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setError(body?.error ?? `فشل في تعديل درجة ${subject}`);
          return;
        }
        updated.push(body);
      }
      const byId = new Map(updated.map((u) => [u.id, u]));
      setLocalItems((prev) =>
        prev.map((g) => {
          const u = byId.get(g.id);
          // نُبقي بيانات الطالب الأصلية — استجابة الـ PATCH لا تُرفق فيها الصف
          return u
            ? { ...g, score: u.score, maxScore: u.maxScore, note: u.note }
            : g;
        })
      );
      setEditingId(null);
      onChanged?.();
    } catch {
      setError("فشل في تعديل الدرجة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" />
            تفاصيل
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>ملف الدرجة — {name}</DialogTitle>
          {multi && (
            <p className="text-sm text-muted-foreground">
              {gradeTypeLabels[grade.type] ?? grade.type} · {formatDate(grade.date)}{" "}
              · {rows.length} {rows.length === 1 ? "طالب" : "طلاب"}
            </p>
          )}
        </DialogHeader>

        <div className="overflow-auto rounded-md border max-h-[70vh]">
          {/* table مباشرة بدل مكوّن Table كي لا يتداخل غلافاه مع التمرير،
              وborder-separate لأن border-collapse الافتراضي يعطّل sticky —
              نفس بنية شبكة الرصد في إضافة الدرجة */}
          <table className="w-full caption-bottom text-sm border-separate border-spacing-0 min-w-max">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky right-0 top-0 z-20 bg-background min-w-40">
                  الطالب
                </TableHead>
                {subjects.map((s) => (
                  <TableHead
                    key={s.subject}
                    className="sticky top-0 z-10 min-w-32 border-s border-border bg-background text-center"
                  >
                    <div className="space-y-1">
                      <div>{s.subject}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        من {s.maxScore}
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
              {rows.map((row) => {
                const isEditing = editable && editingId === row.studentId;
                return (
                  <TableRow
                    key={row.studentId}
                    className="hover:bg-transparent"
                  >
                    <TableCell className="sticky right-0 z-10 min-w-40 bg-background font-medium">
                      {row.studentName}
                      {row.className && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {row.className}
                        </span>
                      )}
                    </TableCell>
                    {subjects.map((s) => {
                      const cell = row.cells.get(s.subject);
                      return (
                        <TableCell
                          key={s.subject}
                          className="border-s border-border p-1 text-center"
                        >
                          {isEditing && cell && !cell.locked ? (
                            <Input
                              type="number"
                              min={0}
                              max={cell.maxScore}
                              value={draft[s.subject] ?? ""}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [s.subject]: e.target.value,
                                }))
                              }
                              className="mx-auto h-8 w-20 px-2 text-center"
                              aria-label={`درجة ${s.subject}`}
                            />
                          ) : cell ? (
                            <span
                              title={
                                cell.locked
                                  ? "درجات التسليمات تُعدّل من صفحة التسليمات"
                                  : undefined
                              }
                            >
                              {cell.score}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="z-10 min-w-32 border-s border-border bg-background p-1 lg:sticky lg:left-0 lg:min-w-44">
                      {isEditing ? (
                        <div className="space-y-2 p-1">
                          <Input
                            value={draftNote}
                            onChange={(e) => setDraftNote(e.target.value)}
                            placeholder="ملاحظة"
                            className="h-8"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => saveRow(row)}
                              disabled={saving}
                            >
                              <Check className="h-3.5 w-3.5" />
                              {saving ? "جارٍ الحفظ..." : "حفظ"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              <X className="h-3.5 w-3.5" />
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 p-1">
                          <div>
                            {row.note ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          {editable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              تعديل
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </table>
        </div>

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        {subjectsReport && subjectsReport.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">ملف المواد — جميع مواد صفك ودرجاتك</h4>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>المادة</TableHead>
                    <TableHead>عدد الدرجات</TableHead>
                    <TableHead>المعدل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectsReport.map((row) => (
                    <TableRow key={row.subject}>
                      <TableCell className="font-medium">{row.subject}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>
                        {row.average !== null ? `${row.average}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
