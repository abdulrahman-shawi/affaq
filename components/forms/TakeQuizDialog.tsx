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
  // answers[موضع العرض] = فهرس الخيار الأصلي المختار (mcq/truefalse) أو نص الإجابة (essay)
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [incompleteWarn, setIncompleteWarn] = useState(false);

  const questions = quiz.questions ?? [];
  const answeredCount = answers.filter(
    (a) => a !== null && (typeof a !== "string" || a.trim() !== "")
  ).length;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // خلط الأسئلة وخياراتها لكل محاولة (الأسئلة الكتابية بلا خيارات للخلط)
      const shuffled = shuffle(
        questions.map((q, origIndex) => ({
          q,
          origIndex,
          optionOrder:
            q.type === "essay" ? [] : shuffle(q.options.map((_, i) => i)),
        }))
      );
      setItems(shuffled);
      setAnswers(shuffled.map(() => null));
      setTimeLeft(
        quiz.durationMinutes ? quiz.durationMinutes * 60 : null
      );
      setError(null);
      setIncompleteWarn(false);
    }
  }

  async function submit(auto: boolean, allowIncomplete = false) {
    // نعيد الإجابات إلى الفهارس الأصلية قبل الإرسال؛ غير المُجاب = -1 للاختيارية و"" للكتابية
    const mapped = questions.map((q, origIdx) => {
      const displayIdx = items.findIndex((it) => it.origIndex === origIdx);
      const a = displayIdx >= 0 ? answers[displayIdx] : null;
      if (q.type === "essay") return typeof a === "string" ? a : "";
      return typeof a === "number" ? a : -1;
    });

    // التسليم الناقص يدويًا يتطلب تأكيدًا أولًا (المؤقّت يسلّم كما هو)
    const hasUnanswered = mapped.some((a, i) =>
      questions[i].type === "essay" ? !String(a).trim() : a === -1
    );
    if (!auto && !allowIncomplete && hasUnanswered) {
      setIncompleteWarn(true);
      return;
    }
    setIncompleteWarn(false);
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
        title:
          body?.graded === false
            ? "تم التسليم — ستظهر درجتك النهائية بعد تصحيح المعلم للأسئلة الكتابية"
            : auto
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
          {items.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                أجبت على {answeredCount} من {items.length}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${items.length ? (answeredCount / items.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
          {items.map(({ q, optionOrder }, qi) => (
            <div key={q.id} className="space-y-2 rounded-md border p-4">
              <p className="text-sm font-medium">
                {qi + 1}. {q.text}
                <span className="mr-2 text-xs text-muted-foreground">
                  ({q.points} {q.points === 1 ? "درجة" : "درجات"})
                </span>
              </p>
              <div className="space-y-1">
                {q.type === "essay" ? (
                  <textarea
                    className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="اكتب إجابتك هنا..."
                    value={typeof answers[qi] === "string" ? (answers[qi] as string) : ""}
                    onChange={(e) => {
                      setIncompleteWarn(false);
                      const value = e.target.value;
                      setAnswers((prev) =>
                        prev.map((a, i) => (i === qi ? value : a))
                      );
                    }}
                  />
                ) : (
                  optionOrder.map((origOptionIdx) => (
                  <label
                    key={origOptionIdx}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                  >
                    <input
                      type="radio"
                      name={`answer-${qi}`}
                      checked={answers[qi] === origOptionIdx}
                      onChange={() => {
                        setIncompleteWarn(false);
                        setAnswers((prev) =>
                          prev.map((a, i) => (i === qi ? origOptionIdx : a))
                        );
                      }}
                    />
                    {q.options[origOptionIdx]}
                  </label>
                ))
                )}
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {incompleteWarn && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <p>
                لم تجب على {items.length - answeredCount}{" "}
                {items.length - answeredCount === 1 ? "سؤال" : "أسئلة"} —
                الأسئلة غير المُجابة ستُحسب خاطئة.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => submit(false, true)}
                >
                  تسليم على أي حال
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIncompleteWarn(false)}
                >
                  متابعة الإجابة
                </Button>
              </div>
            </div>
          )}
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
