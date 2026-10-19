"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClassLevelDTO, CreateClassInput } from "@/types";

export function useClasses() {
  const [classes, setClasses] = useState<ClassLevelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classes");
      if (!res.ok) throw new Error("فشل في تحميل الصفوف");
      setClasses(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createClass = useCallback(async (data: CreateClassInput) => {
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في إضافة الصف");
    }
    return res.json();
  }, []);

  return { classes, loading, error, refetch, createClass };
}
