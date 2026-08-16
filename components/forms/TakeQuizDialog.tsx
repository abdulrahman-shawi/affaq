"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import type { QuizDTO } from "@/types";

export default function TakeQuizDialog({
  quiz,
  studentId,
  onSuccess,
  trigger,
}: {
  quiz: QuizDTO;
  studentId: string;
  onSuccess?: () => void;
  trigger: ReactNode;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const questions = quiz.questions ?? [];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setAnswers(questions.map(() => null));
      setError(null);
    }
  }

  async function handleSubmit() {
    if (answers.some((a) => a === null)) {
      setError("يجب الإجابة على جميع الأسئلة قبل التسليم");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, answers }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "فشل في تسليم الاختبار");
      }
      setOpen(false);
      toast({
        variant: "success",
        title: `تم التسليم — درجتك: ${body.score} من ${body.maxScore}`,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{quiz.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={q.id} className="space-y-2 rounded-md border p-4">
              <p className="text-sm font-medium">
                {qi + 1}. {q.text}
                <span className="mr-2 text-xs text-muted-foreground">
                  ({q.points} {q.points === 1 ? "درجة" : "درجات"})
                </span>
              </p>
              <div className="space-y-1">
                {q.options.map((option, oi) => (
                  <label
                    key={oi}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                  >
                    <input
                      type="radio"
                      name={`answer-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() =>
                        setAnswers((prev) =>
                          prev.map((a, i) => (i === qi ? oi : a))
                        )
                      }
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "جارٍ التسليم..." : "تسليم الاختبار"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
