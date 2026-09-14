"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getPusherClient } from "@/app/lib/pusher-client";

export type ChatReactionSummary = {
  emoji: string;
  count: number;
  mine: boolean;
};

export type ChatMessageDTO = {
  id: string;
  classId: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  sender: { id: string; name: string; role: string; image: string | null };
  replyTo: {
    id: string;
    content: string | null;
    imageUrl: string | null;
    senderName: string;
  } | null;
  reactions: ChatReactionSummary[];
};

export type ChatListItem = {
  classId: string;
  className: string;
  lastMessage: {
    senderName: string;
    content: string | null;
    imageUrl: string | null;
    createdAt: string;
  } | null;
};

export function useChatList() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) throw new Error("فشل في تحميل المحادثات");
      setChats(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل في تحميل المحادثات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { chats, loading, error, refetch };
}

function summarizeRaw(
  raw: { userId: string; emoji: string }[],
  viewerId: string
): ChatReactionSummary[] {
  const map = new Map<string, ChatReactionSummary>();
  for (const r of raw) {
    const entry =
      map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    entry.count += 1;
    if (r.userId === viewerId) entry.mine = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.values());
}

export function useClassChat(classId: string | null, viewerId?: string) {
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/${classId}/messages`);
      if (!res.ok) throw new Error("فشل في تحميل الرسائل");
      const data = await res.json();
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل في تحميل الرسائل");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    setMessages([]);
    load();
  }, [load]);

  // اشتراك Pusher — وعند تعذّره نعود للاستطلاع الدوري
  useEffect(() => {
    if (!classId) return;
    const pusher = getPusherClient();
    if (!pusher) {
      pollRef.current = setInterval(load, 10000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }

    const channel = pusher.subscribe(`private-chat-class-${classId}`);

    channel.bind("pusher:subscription_succeeded", () => setLive(true));
    channel.bind("pusher:subscription_error", () => {
      setLive(false);
      if (!pollRef.current) pollRef.current = setInterval(load, 10000);
    });

    channel.bind("new-message", (dto: ChatMessageDTO) => {
      setMessages((prev) =>
        prev.some((m) => m.id === dto.id) ? prev : [...prev, dto]
      );
    });

    channel.bind(
      "reaction",
      (data: { messageId: string; reactions: { userId: string; emoji: string }[] }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, reactions: summarizeRaw(data.reactions, viewerId ?? "") }
              : m
          )
        );
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-chat-class-${classId}`);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setLive(false);
    };
  }, [classId, viewerId, load]);

  const loadOlder = useCallback(async () => {
    if (!classId || messages.length === 0 || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/chat/${classId}/messages?before=${messages[0].id}`
      );
      if (!res.ok) throw new Error("فشل في تحميل الرسائل");
      const data = await res.json();
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch {
      // يبقى زر التحميل متاحاً للمحاولة مجدداً
    } finally {
      setLoadingOlder(false);
    }
  }, [classId, messages, loadingOlder, hasMore]);

  const sendMessage = useCallback(
    async (input: {
      content?: string;
      imageUrl?: string;
      replyToId?: string;
    }) => {
      if (!classId) return;
      const res = await fetch(`/api/chat/${classId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "فشل في إرسال الرسالة");
      // الإلحاق الفوري — حدث Pusher يصل لاحقاً ويتجاهل المكرر بالـ id
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data]
      );
    },
    [classId]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      // تحديث تفاؤلي
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          if (existing?.mine) {
            const reactions = m.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, mine: false }
                  : r
              )
              .filter((r) => r.count > 0);
            return { ...m, reactions };
          }
          if (existing) {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count + 1, mine: true }
                  : r
              ),
            };
          }
          return {
            ...m,
            reactions: [...m.reactions, { emoji, count: 1, mine: true }],
          };
        })
      );
      const res = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) load();
    },
    [load]
  );

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    live,
    loadOlder,
    sendMessage,
    toggleReaction,
    refetch: load,
  };
}
