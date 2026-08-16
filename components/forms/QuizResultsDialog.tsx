"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import EmptyState from "@/components/shared/EmptyState";
import { formatDate } from "@/app/lib/utils";
import type { QuizDTO } from "@/types";

export default function QuizResultsDialog({
  quiz,
  trigger,
}: {
  quiz: QuizDTO;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const attempts = quiz.attempts ?? [];

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
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {attempt.student?.user?.name ?? "طالب"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(attempt.submittedAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold" dir="ltr">
                  {attempt.score} / {attempt.maxScore}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
