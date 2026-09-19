"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShowcasePostDTO, CreateShowcasePostInput } from "@/types";

export function useShowcase() {
  const [posts, setPosts] = useState<ShowcasePostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/showcase");
      if (!res.ok) throw new Error("فشل في تحميل المنشورات");
      setPosts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addPost = useCallback(
    async (input: CreateShowcasePostInput) => {
      const res = await fetch("/api/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "فشل في إضافة المنشور");
      }
      await refetch();
    },
    [refetch]
  );

  const deletePost = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/showcase/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "فشل في حذف المنشور");
      }
      await refetch();
    },
    [refetch]
  );

  return { posts, loading, error, refetch, addPost, deletePost };
}
