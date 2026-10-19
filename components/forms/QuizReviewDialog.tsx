"use client";

import { type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { QuizAttemptDTO, QuizDTO } from "@/types";

export default function QuizReviewDialog({
  quiz,
  attempt,
  trigger,
}: {
  quiz: QuizDTO;
  attempt: QuizAttemptDTO;
  trigger: ReactNode;
}) {
  const questions = quiz.questions ?? [];
  const myAnswers = attempt.answers ?? [];

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>مراجعة: {quiz.title}</span>
            {attempt.graded === false ? (
              <Badge variant="warning">قيد التصحيح</Badge>
            ) : (
              <Badge variant="success">
                {attempt.score} / {attempt.maxScore}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {questions.map((q, qi) => {
            const myAnswer = myAnswers[qi];
            // الأسئلة الكتابية: لا تصحيح تلقائي — نعرض الإجابة ودرجة المعلم إن وُجدت
            if (q.type === "essay") {
              const essayScore = attempt.essayScores?.[qi];
              return (
                <div key={q.id} className="space-y-2 rounded-md border p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {attempt.graded === false ? (
                      <Badge variant="warning">قيد التصحيح</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {essayScore ?? 0} / {q.points}
                      </Badge>
                    )}
                    <span>
                      {qi + 1}. {q.text}
                      <span className="mr-2 text-xs text-muted-foreground">
                        ({q.points} {q.points === 1 ? "درجة" : "درجات"})
                      </span>
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-sm">
                    {typeof myAnswer === "string" && myAnswer.trim()
                      ? myAnswer
                      : "— لم تُجب —"}
                  </p>
                </div>
              );
            }
            const isCorrect = myAnswer === q.correctIndex;
            return (
              <div key={q.id} className="space-y-2 rounded-md border p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span>
                    {qi + 1}. {q.text}
                    <span className="mr-2 text-xs text-muted-foreground">
                      ({q.points} {q.points === 1 ? "درجة" : "درجات"})
                    </span>
                  </span>
                </p>
                <div className="space-y-1">
                  {q.options.map((option, oi) => {
                    const isCorrectOption = oi === q.correctIndex;
                    const isMyWrongChoice = oi === myAnswer && !isCorrectOption;
                    return (
                      <div
                        key={oi}
                        className={`rounded-md px-2 py-1 text-sm ${
                          isCorrectOption
                            ? "bg-emerald-50 font-medium text-emerald-700"
                            : isMyWrongChoice
                              ? "bg-red-50 text-destructive line-through"
                              : "text-muted-foreground"
                        }`}
                      >
                        {option}
                        {isCorrectOption && " ✓"}
                        {isMyWrongChoice && " — إجابتك"}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
