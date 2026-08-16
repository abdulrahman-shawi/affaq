"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClasses } from "@/hooks/useClasses";
import type { QuizDTO, StudentDTO } from "@/types";

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function ReportsExport({ students }: { students: StudentDTO[] }) {
  const { classes } = useClasses();
  const [gradeStudentId, setGradeStudentId] = useState("");
  const [paymentStudentId, setPaymentStudentId] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [classId, setClassId] = useState("");
  const [gradesClassId, setGradesClassId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);
  const [quizId, setQuizId] = useState("");

  useEffect(() => {
    fetch("/api/quizzes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setQuizzes)
      .catch(() => setQuizzes([]));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>تصدير التقارير (Excel)</CardTitle>
        <CardDescription>
          تحميل بطاقة درجات طالب، كشف مدفوعات، تقرير الحضور الشهري، والمزيد
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <h3 className="font-medium">بطاقة درجات طالب</h3>
            <select
              className={selectClassName}
              value={gradeStudentId}
              onChange={(e) => setGradeStudentId(e.target.value)}
            >
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.name ?? s.id}
                </option>
              ))}
            </select>
            <Button
              disabled={!gradeStudentId}
              onClick={() =>
                (window.location.href = `/api/reports/grade-card?studentId=${gradeStudentId}`)
              }
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">كشف مدفوعات طالب</h3>
            <select
              className={selectClassName}
              value={paymentStudentId}
              onChange={(e) => setPaymentStudentId(e.target.value)}
            >
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.name ?? s.id}
                </option>
              ))}
            </select>
            <Button
              disabled={!paymentStudentId}
              onClick={() =>
                (window.location.href = `/api/reports/payments?studentId=${paymentStudentId}`)
              }
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">تقرير الحضور الشهري</h3>
            <div className="flex gap-2">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <select
                className={selectClassName}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">كل الصفوف</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={!month}
              onClick={() =>
                (window.location.href = `/api/reports/attendance?month=${month}${
                  classId ? `&classId=${classId}` : ""
                }`)
              }
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">درجات صف كامل</h3>
            <select
              className={selectClassName}
              value={gradesClassId}
              onChange={(e) => setGradesClassId(e.target.value)}
            >
              <option value="">اختر الصف</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!gradesClassId}
              onClick={() =>
                (window.location.href = `/api/reports/class-grades?classId=${gradesClassId}`)
              }
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">كشف مدفوعات بفترة</h3>
            <div className="flex gap-2">
              <Input
                type="date"
                dir="ltr"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                type="date"
                dir="ltr"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button
              disabled={!from || !to}
              onClick={() =>
                (window.location.href = `/api/reports/payments-period?from=${from}&to=${to}`)
              }
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">تقرير الاشتراكات</h3>
            <p className="text-xs text-muted-foreground">
              حالة كل اشتراك مع تاريخ الانتهاء وبيانات ولي الأمر
            </p>
            <Button
              onClick={() =>
                (window.location.href = "/api/reports/subscriptions")
              }
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">نتائج اختبار</h3>
            <select
              className={selectClassName}
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
            >
              <option value="">اختر الاختبار</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} — {q.subject}
                </option>
              ))}
            </select>
            <Button
              disabled={!quizId}
              onClick={() =>
                (window.location.href = `/api/reports/quiz-results?quizId=${quizId}`)
              }
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
