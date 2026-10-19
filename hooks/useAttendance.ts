"use client";

import { useCallback, useEffect, useState } from "react";
import type { AttendanceDTO, CreateAttendanceInput } from "@/types";

export function useAttendance() {
  const [attendance, setAttendance] = useState<AttendanceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance");
      if (!res.ok) throw new Error("فشل في تحميل سجلات الحضور");
      setAttendance(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createAttendance = useCallback(async (data: CreateAttendanceInput) => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في تسجيل الحضور");
    }
    return res.json();
  }, []);

  return { attendance, loading, error, refetch, createAttendance };
}
