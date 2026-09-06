"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupervisorDTO, CreateSupervisorInput } from "@/types";

export function useSupervisors() {
  const [supervisors, setSupervisors] = useState<SupervisorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisors");
      if (!res.ok) throw new Error("فشل في تحميل المشرفين");
      setSupervisors(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createSupervisor = useCallback(async (data: CreateSupervisorInput) => {
    const res = await fetch("/api/supervisors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في إضافة المشرف");
    }
    return res.json();
  }, []);

  return { supervisors, loading, error, refetch, createSupervisor };
}
