"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaymentDTO, CreatePaymentInput } from "@/types";

export function usePayments() {
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("فشل في تحميل المدفوعات");
      setPayments(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createPayment = useCallback(async (data: CreatePaymentInput) => {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "فشل في تسجيل الدفعة");
    }
    return res.json();
  }, []);

  return { payments, loading, error, refetch, createPayment };
}
