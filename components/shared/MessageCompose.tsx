"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  containsLinkOrPhone,
  FORBIDDEN_CONTENT_MESSAGE,
} from "@/app/lib/messageValidation";
import type { MessageTargetsDTO } from "@/types";

const roleLabels: Record<string, string> = {
  admin: "إدارة",
  supervisor: "مشرف",
  teacher: "معلم",
  student: "طالب",
  parent: "ولي أمر",
};

const roleOrder = ["admin", "supervisor", "teacher", "student", "parent"];

export default function MessageCompose({
  onSent,
}: {
  onSent?: () => void;
}) {
  const { user } = useAuth();
  const [targets, setTargets] = useState<MessageTargetsDTO | null>(null);
  const [content, setContent] = useState("");
  const [toAll, setToAll] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/messages/recipients")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setTargets(data);
      })
      .catch(() => {});
  }, []);

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

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
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
        onSent?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      } finally {
        setSending(false);
      }
    },
    [content, user, hasTarget, toAll, selectedClassIds, selectedUserIds, onSent]
  );

  if (
    !targets ||
    (!targets.canSendToAll &&
      targets.classes.length === 0 &&
      targets.users.length === 0)
  ) {
    return null;
  }

  return (
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
                          setSelectedClassIds((prev) => toggleId(prev, c.id))
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
  );
}
