"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { MessageDTO, MessageTargetsDTO } from "@/types";

const roleLabels: Record<string, string> = {
  admin: "إدارة",
  teacher: "معلم",
  student: "طالب",
  parent: "ولي أمر",
};

const roleOrder = ["admin", "teacher", "student", "parent"];

export default function MessagesPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [targets, setTargets] = useState<MessageTargetsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [toAll, setToAll] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [messagesRes, targetsRes] = await Promise.all([
        fetch("/api/messages"),
        fetch("/api/messages/recipients"),
      ]);
      if (messagesRes.ok) setMessages(await messagesRes.json());
      if (targetsRes.ok) setTargets(await targetsRes.json());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(() => refetch(true), 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  const filteredUsers = useMemo(() => {
    if (!targets) return [];
    const q = userFilter.trim();
    const users = q
      ? targets.users.filter(
          (u) => u.name.includes(q) || (u.detail ?? "").includes(q)
        )
      : targets.users;
    return roleOrder
      .map((role) => ({
        role,
        users: users.filter((u) => u.role === role),
      }))
      .filter((g) => g.users.length > 0);
  }, [targets, userFilter]);

  const hasTarget =
    toAll || selectedClassIds.length > 0 || selectedUserIds.length > 0;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !user || !hasTarget) return;
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
          toAll,
          classIds: toAll ? [] : selectedClassIds,
          recipientIds: toAll ? [] : selectedUserIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "فشل في إرسال الرسالة");
      }
      setContent("");
      setToAll(false);
      setSelectedClassIds([]);
      setSelectedUserIds([]);
      await refetch(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSending(false);
    }
  }

  function audienceLabel(m: MessageDTO): string {
    if (m.toAll) return "الجميع";
    const parts = [
      ...m.classes.map((c) => `صف ${c.name}`),
      ...m.recipients.map((r) => r.name),
    ];
    return parts.join("، ");
  }

  const canCompose = targets && (targets.canSendToAll || targets.classes.length > 0 || targets.users.length > 0);

  return (
    <div className="space-y-6">
      {canCompose && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">رسالة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">إلى:</p>

                {targets.canSendToAll && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={toAll}
                      onChange={(e) => setToAll(e.target.checked)}
                    />
                    إرسال للجميع
                  </label>
                )}

                {!toAll && targets.classes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">الصفوف</p>
                    <div className="flex flex-wrap gap-3">
                      {targets.classes.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={selectedClassIds.includes(c.id)}
                            onChange={() =>
                              setSelectedClassIds((prev) =>
                                toggleId(prev, c.id)
                              )
                            }
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {!toAll && targets.users.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">الأشخاص</p>
                    {targets.users.length > 6 && (
                      <Input
                        placeholder="بحث بالاسم..."
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                      />
                    )}
                    <div className="max-h-48 space-y-3 overflow-y-auto">
                      {filteredUsers.map((group) => (
                        <div key={group.role} className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            {roleLabels[group.role] ?? group.role}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {group.users.map((u) => (
                              <label
                                key={u.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-primary"
                                  checked={selectedUserIds.includes(u.id)}
                                  onChange={() =>
                                    setSelectedUserIds((prev) =>
                                      toggleId(prev, u.id)
                                    )
                                  }
                                />
                                {u.name}
                                {u.detail && (
                                  <span className="text-xs text-muted-foreground">
                                    ({u.detail})
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          لا توجد نتائج مطابقة
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

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
              <Button type="submit" disabled={sending || !hasTarget}>
                <Send className="h-4 w-4" />
                {sending ? "جارٍ الإرسال..." : "إرسال"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
              {messages.map((m) => {
                const isMine = m.sender.id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`rounded-md border p-3 ${isMine ? "bg-muted/50" : ""}`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {isMine ? "أنت" : m.sender.name}
                      </span>
                      <Badge variant="secondary">
                        {roleLabels[m.sender.role] ?? m.sender.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        إلى: {audienceLabel(m)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">{m.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
