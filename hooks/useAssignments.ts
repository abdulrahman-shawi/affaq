"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssignmentDTO, CreateAssignmentInput } from "@/types";

export function useAssignments() {
  const [assignments, setAssignments] = useState<AssignmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("فشل في تحميل الواجبات");
      setAssignments(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createAssignment = useCallback(async (data: CreateAssignmentInput) => {
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في إنشاء الواجب");
    }
    return res.json();
  }, []);

  return { assignments, loading, error, refetch, createAssignment };
}
