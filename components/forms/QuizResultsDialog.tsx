"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/toaster";
import { formatDate } from "@/app/lib/utils";
import type { QuizAttemptDTO, QuizDTO } from "@/types";

function GradingDialog({
  quiz,
  attempt,
  onSuccess,
  trigger,
}: {
  quiz: QuizDTO;
  attempt: QuizAttemptDTO;
  onSuccess?: () => void;
  trigger: ReactNode;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questions = quiz.questions ?? [];
  const essayIndexes = questions
    .map((q, i) => (q.type === "essay" ? i : -1))
    .filter((i) => i >= 0);
  // درجات بترتيب أسئلة الاختبار كلها؛ قيم غير الكتابية تبقى 0
  const [scores, setScores] = useState<number[]>(() =>
    questions.map((_, i) => attempt.essayScores?.[i] ?? 0)
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts/${attempt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayScores: scores }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "فشل في حفظ التصحيح");
      }
      setOpen(false);
      toast({ variant: "success", title: "تم حفظ التصحيح" });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            تصحيح إجابات: {attempt.student?.user?.name ?? "طالب"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {essayIndexes.map((qi) => {
            const q = questions[qi];
            const answer = attempt.answers?.[qi];
            return (
              <div key={q.id} className="space-y-2 rounded-md border p-4">
                <p className="text-sm font-medium">
                  {qi + 1}. {q.text}
                  <span className="mr-2 text-xs text-muted-foreground">
                    ({q.points} {q.points === 1 ? "درجة" : "درجات"})
                  </span>
                </p>
                <p className="whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-sm">
                  {typeof answer === "string" && answer.trim()
                    ? answer
                    : "— لم يُجب —"}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={q.points}
                    step="any"
                    className="h-8 w-24"
                    value={scores[qi]}
                    onChange={(e) =>
                      setScores((prev) =>
                        prev.map((s, i) =>
                          i === qi ? Number(e.target.value) : s
                        )
                      )
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    من {q.points}
                  </span>
                </div>
              </div>
            );
          })}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "جارٍ الحفظ..." : "حفظ التصحيح"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuizResultsDialog({
  quiz,
  onSuccess,
  trigger,
}: {
  quiz: QuizDTO;
  onSuccess?: () => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const attempts = quiz.attempts ?? [];
  const hasEssay = (quiz.questions ?? []).some((q) => q.type === "essay");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>نتائج: {quiz.title}</DialogTitle>
        </DialogHeader>
        {attempts.length === 0 ? (
          <EmptyState
            title="لا توجد محاولات بعد"
            message="لم يؤدِّ أي طالب هذا الاختبار"
          />
        ) : (
          <div className="space-y-2">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {attempt.student?.user?.name ?? "طالب"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(attempt.submittedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {attempt.graded === false ? (
                    <Badge variant="warning">قيد التصحيح</Badge>
                  ) : (
                    <span className="text-sm font-semibold" dir="ltr">
                      {attempt.score} / {attempt.maxScore}
                    </span>
                  )}
                  {hasEssay && (
                    <GradingDialog
                      quiz={quiz}
                      attempt={attempt}
                      onSuccess={onSuccess}
                      trigger={
                        <Button variant="outline" size="sm">
                          تصحيح
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
