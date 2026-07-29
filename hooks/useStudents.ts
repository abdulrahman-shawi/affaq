"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudentDTO, CreateStudentInput } from "@/types";

export function useStudents() {
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("فشل في تحميل الطلاب");
      setStudents(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createStudent = useCallback(async (data: CreateStudentInput) => {
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في إضافة الطالب");
    }
    return res.json();
  }, []);

  return { students, loading, error, refetch, createStudent };
}
