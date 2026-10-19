"use client";

import { useCallback, useEffect, useState } from "react";
import type { SubjectDTO, CreateSubjectInput } from "@/types";

export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("فشل في تحميل المواد");
      setSubjects(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createSubject = useCallback(async (data: CreateSubjectInput) => {
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في إضافة المادة");
    }
    return res.json();
  }, []);

  return { subjects, loading, error, refetch, createSubject };
}
