"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizDTO, CreateQuizInput } from "@/types";

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quizzes");
      if (!res.ok) throw new Error("فشل في تحميل الاختبارات");
      setQuizzes(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createQuiz = useCallback(
    async (data: CreateQuizInput & { teacherId: string }) => {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في إنشاء الاختبار");
      }
      return res.json();
    },
    []
  );

  return { quizzes, loading, error, refetch, createQuiz };
}
