"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import type { QuizDTO, QuizQuestionDTO } from "@/types";

interface ShuffledQuestion {
  q: QuizQuestionDTO;
  origIndex: number; // موضع السؤال في الترتيب الأصلي
  optionOrder: number[]; // optionOrder[موضع العرض] = فهرس الخيار الأصلي
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
  const [items, setItems] = useState<ShuffledQuestion[]>([]);
  // answers[موضع العرض] = فهرس الخيار الأصلي المختار
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const questions = quiz.questions ?? [];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // خلط الأسئلة وخياراتها لكل محاولة
      const shuffled = shuffle(
        questions.map((q, origIndex) => ({
          q,
          origIndex,
          optionOrder: shuffle(q.options.map((_, i) => i)),
        }))
      );
      setItems(shuffled);
      setAnswers(shuffled.map(() => null));
      setTimeLeft(
        quiz.durationMinutes ? quiz.durationMinutes * 60 : null
      );
      setError(null);
    }
  }

  async function submit(auto: boolean) {
    // نعيد الإجابات إلى الفهارس الأصلية قبل الإرسال؛ غير المُجاب = -1
    const mapped = questions.map((_, origIdx) => {
      const displayIdx = items.findIndex((it) => it.origIndex === origIdx);
      const a = displayIdx >= 0 ? answers[displayIdx] : null;
      return a ?? -1;
    });

    if (!auto && mapped.some((a) => a === -1)) {
      setError("يجب الإجابة على جميع الأسئلة قبل التسليم");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, answers: mapped }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "فشل في تسليم الاختبار");
      }
      setOpen(false);
      toast({
        variant: "success",
        title: auto
          ? `انتهى الوقت — تم التسليم تلقائيًا. درجتك: ${body.score} من ${body.maxScore}`
          : `تم التسليم — درجتك: ${body.score} من ${body.maxScore}`,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  // مرجع لأحدث نسخة من التسليم حتى لا يلتقط المؤقّت حالة قديمة
  const submitRef = useRef(submit);
  submitRef.current = submit;

  // العد التنازلي: تسليم تلقائي عند انتهاء الوقت
  useEffect(() => {
    if (!open || timeLeft === null || submitting) return;
    if (timeLeft <= 0) {
      void submitRef.current(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [open, timeLeft, submitting]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>{quiz.title}</span>
            {timeLeft !== null && (
              <span
                className={`flex items-center gap-1 text-sm font-semibold ${
                  timeLeft <= 60 ? "text-destructive" : "text-muted-foreground"
                }`}
                dir="ltr"
              >
                <Timer className="h-4 w-4" />
                {formatTime(timeLeft)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map(({ q, optionOrder }, qi) => (
            <div key={q.id} className="space-y-2 rounded-md border p-4">
              <p className="text-sm font-medium">
                {qi + 1}. {q.text}
                <span className="mr-2 text-xs text-muted-foreground">
                  ({q.points} {q.points === 1 ? "درجة" : "درجات"})
                </span>
              </p>
              <div className="space-y-1">
                {optionOrder.map((origOptionIdx) => (
                  <label
                    key={origOptionIdx}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                  >
                    <input
                      type="radio"
                      name={`answer-${qi}`}
                      checked={answers[qi] === origOptionIdx}
                      onChange={() =>
                        setAnswers((prev) =>
                          prev.map((a, i) => (i === qi ? origOptionIdx : a))
                        )
                      }
                    />
                    {q.options[origOptionIdx]}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={submitting}
            onClick={() => submit(false)}
          >
            {submitting ? "جارٍ التسليم..." : "تسليم الاختبار"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
