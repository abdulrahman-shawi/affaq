"use client";

import { useCallback, useEffect, useState } from "react";
import type { TimetableSlotDTO, CreateTimetableSlotInput } from "@/types";

export function useTimetable(filters: { classId?: string; teacherId?: string }) {
  const { classId, teacherId } = filters;
  const [slots, setSlots] = useState<TimetableSlotDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!classId && !teacherId) {
      setSlots([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = classId
        ? `classId=${classId}`
        : `teacherId=${teacherId}`;
      const res = await fetch(`/api/timetable?${query}`);
      if (!res.ok) throw new Error("فشل في تحميل الجدول");
      setSlots(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, [classId, teacherId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createSlot = useCallback(async (data: CreateTimetableSlotInput) => {
    const res = await fetch("/api/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في إضافة الحصة");
    }
    return res.json();
  }, []);

  return { slots, loading, error, refetch, createSlot };
}
