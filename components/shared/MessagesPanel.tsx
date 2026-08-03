"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/app/lib/utils";
import {
  containsLinkOrPhone,
  FORBIDDEN_CONTENT_MESSAGE,
} from "@/app/lib/messageValidation";
import type { MessageDTO } from "@/types";

const senderTypeLabels: Record<string, string> = {
  teacher: "معلم",
  student: "طالب",
  parent: "ولي أمر",
};

export default function MessagesPanel({ senderType }: { senderType: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("فشل في تحميل الرسائل");
      setMessages(await res.json());
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !user) return;
    if (containsLinkOrPhone(content)) {
      setError(FORBIDDEN_CONTENT_MESSAGE);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          senderType,
          senderId: user.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "فشل في إرسال الرسالة");
      }
      setContent("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">رسالة جديدة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="message-content">نص الرسالة</Label>
              <Input
                id="message-content"
                required
                placeholder="اكتب رسالتك هنا..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={sending}>
              <Send className="h-4 w-4" />
              {sending ? "جارٍ الإرسال..." : "إرسال"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">صندوق الرسائل</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loading />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="لا توجد رسائل"
              message="ستظهر الرسائل هنا عند ورودها"
            />
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary">
                      {senderTypeLabels[m.senderType] ?? m.senderType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
