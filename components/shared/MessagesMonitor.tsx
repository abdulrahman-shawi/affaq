"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessagesSquare, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import MessageCompose from "@/components/shared/MessageCompose";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/app/lib/utils";
import {
  containsLinkOrPhone,
  FORBIDDEN_CONTENT_MESSAGE,
} from "@/app/lib/messageValidation";
import type { MessageDTO, MessageSenderDTO } from "@/types";

const roleLabels: Record<string, string> = {
  admin: "إدارة",
  supervisor: "مشرف",
  teacher: "معلم",
  student: "طالب",
  parent: "ولي أمر",
};

type TabKey =
  | "teacher-student"
  | "classes"
  | "parents"
  | "supervisors"
  | "admin"
  | "multi"
  | "general";

const tabLabels: { key: TabKey; label: string }[] = [
  { key: "teacher-student", label: "معلم ↔ طالب" },
  { key: "classes", label: "الصفوف" },
  { key: "parents", label: "أولياء الأمور" },
  { key: "supervisors", label: "المشرفون" },
  { key: "admin", label: "الإدارة" },
  { key: "multi", label: "رسائل متعددة" },
  { key: "general", label: "رسائل عامة" },
];

interface DirectThread {
  kind: "direct";
  key: string;
  users: MessageSenderDTO[];
  messages: MessageDTO[];
}

interface ClassThread {
  kind: "class";
  key: string;
  classId: string;
  className: string;
  messages: MessageDTO[];
}

type Thread = DirectThread | ClassThread;

type ThreadTab = "teacher-student" | "classes" | "parents" | "supervisors" | "admin";

interface Classified {
  threads: Record<ThreadTab, Thread[]>;
  multi: MessageDTO[];
  general: MessageDTO[];
}

function directThreadTab(users: MessageSenderDTO[]): ThreadTab {
  const roles = new Set(users.map((u) => u.role));
  if (users.length === 2 && roles.has("teacher") && roles.has("student")) {
    return "teacher-student";
  }
  if (roles.has("parent")) return "parents";
  if (roles.has("supervisor")) return "supervisors";
  return "admin";
}

function classifyMessages(messages: MessageDTO[]): Classified {
  const result: Classified = {
    threads: {
      "teacher-student": [],
      classes: [],
      parents: [],
      supervisors: [],
      admin: [],
    },
    multi: [],
    general: [],
  };
  const directThreads = new Map<string, DirectThread>();
  const classThreads = new Map<string, ClassThread>();

  for (const m of messages) {
    if (m.toAll) {
      result.general.push(m);
      continue;
    }
    if (m.classes.length === 1 && m.recipients.length === 0) {
      const cls = m.classes[0];
      let thread = classThreads.get(cls.id);
      if (!thread) {
        thread = {
          kind: "class",
          key: cls.id,
          classId: cls.id,
          className: cls.name,
          messages: [],
        };
        classThreads.set(cls.id, thread);
      }
      thread.messages.push(m);
      continue;
    }
    if (m.classes.length === 0 && m.recipients.length >= 1) {
      const involved = new Map<string, MessageSenderDTO>();
      for (const u of [m.sender, ...m.recipients]) {
        if (u.role !== "admin") involved.set(u.id, u);
      }
      if (involved.size === 0) involved.set(m.sender.id, m.sender);
      if (involved.size <= 2) {
        const users = Array.from(involved.values()).sort((a, b) =>
          a.id.localeCompare(b.id)
        );
        const key = users.map((u) => u.id).join("|");
        let thread = directThreads.get(key);
        if (!thread) {
          thread = { kind: "direct", key, users, messages: [] };
          directThreads.set(key, thread);
        }
        thread.messages.push(m);
        continue;
      }
    }
    result.multi.push(m);
  }

  result.threads.classes = Array.from(classThreads.values());
  for (const thread of Array.from(directThreads.values())) {
    result.threads[directThreadTab(thread.users)].push(thread);
  }

  const lastActivity = (t: Thread) =>
    t.messages.reduce((max, m) => (m.createdAt > max ? m.createdAt : max), "");
  for (const tab of Object.keys(result.threads) as ThreadTab[]) {
    result.threads[tab].sort((a, b) =>
      lastActivity(b).localeCompare(lastActivity(a))
    );
  }
  return result;
}

function userLabel(u: MessageSenderDTO, meId?: string): string {
  if (u.id === meId) return "أنت";
  return `${u.name} (${roleLabels[u.role] ?? u.role})`;
}

function threadTitle(thread: Thread, meId?: string): string {
  if (thread.kind === "class") return `صف ${thread.className}`;
  const others = thread.users.filter((u) => u.id !== meId);
  if (thread.users.length === 1) {
    if (others.length === 0) return "الإدارة";
    return `الإدارة ↔ ${userLabel(others[0], meId)}`;
  }
  const shown = others.length > 0 ? others : thread.users;
  return shown.map((u) => userLabel(u, meId)).join(" ↔ ");
}

// جهات الرد في محادثة فردية: كل المشاركين في رسائلها ما عدا المستخدم الحالي
function replyRecipients(thread: DirectThread, meId?: string): string[] {
  const ids = new Set<string>();
  for (const m of thread.messages) {
    if (m.sender.id !== meId) ids.add(m.sender.id);
    for (const r of m.recipients) {
      if (r.id !== meId) ids.add(r.id);
    }
  }
  return Array.from(ids);
}

function audienceLabel(m: MessageDTO): string {
  if (m.toAll) return "الجميع";
  const parts = [
    ...m.classes.map((c) => `صف ${c.name}`),
    ...m.recipients.map((r) => r.name),
  ];
  return parts.join("، ");
}

export default function MessagesMonitor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("teacher-student");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (res.ok) setMessages(await res.json());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(() => refetch(true), 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  const classified = useMemo(() => classifyMessages(messages), [messages]);

  const counts: Record<TabKey, number> = useMemo(
    () => ({
      "teacher-student": classified.threads["teacher-student"].length,
      classes: classified.threads.classes.length,
      parents: classified.threads.parents.length,
      supervisors: classified.threads.supervisors.length,
      admin: classified.threads.admin.length,
      multi: classified.multi.length,
      general: classified.general.length,
    }),
    [classified]
  );

  const visibleTabs = useMemo(
    () => tabLabels.filter((t) => counts[t.key] > 0),
    [counts]
  );

  useEffect(() => {
    if (
      visibleTabs.length > 0 &&
      !visibleTabs.some((t) => t.key === activeTab)
    ) {
      setActiveTab(visibleTabs[0].key);
      setSelectedKey(null);
    }
  }, [visibleTabs, activeTab]);

  const isThreadTab = activeTab !== "multi" && activeTab !== "general";
  const activeThreads: Thread[] = isThreadTab
    ? classified.threads[activeTab]
    : [];
  const selectedThread =
    activeThreads.find((t) => t.key === selectedKey) ?? null;

  const threadMessages = useMemo(
    () =>
      selectedThread
        ? [...selectedThread.messages].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt)
          )
        : [],
    [selectedThread]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedKey, threadMessages.length]);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setSelectedKey(null);
    setReply("");
    setError(null);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !selectedThread) return;
    if (containsLinkOrPhone(reply)) {
      setError(FORBIDDEN_CONTENT_MESSAGE);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const body =
        selectedThread.kind === "class"
          ? {
              content: reply,
              toAll: false,
              classIds: [selectedThread.classId],
              recipientIds: [],
            }
          : {
              content: reply,
              toAll: false,
              classIds: [],
              recipientIds: replyRecipients(selectedThread, user?.id),
            };
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "فشل في إرسال الرد");
      }
      setReply("");
      await refetch(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSending(false);
    }
  }

  function renderFlatList(list: MessageDTO[], emptyTitle: string) {
    if (list.length === 0) {
      return (
        <EmptyState
          icon={MessagesSquare}
          title={emptyTitle}
          message="ستظهر الرسائل هنا عند ورودها"
        />
      );
    }
    return (
      <div className="space-y-3">
        {list.map((m) => {
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
    );
  }

  return (
    <div className="space-y-6">
      <MessageCompose onSent={() => refetch(true)} />

      {visibleTabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {tab.label}
              <span className="ms-2 text-xs opacity-70">
                ({counts[tab.key]})
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : visibleTabs.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="لا توجد رسائل"
          message="ستظهر الرسائل هنا عند ورودها"
        />
      ) : !isThreadTab ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tabLabels.find((t) => t.key === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderFlatList(
              activeTab === "multi" ? classified.multi : classified.general,
              "لا توجد رسائل"
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Card className={selectedThread ? "hidden md:block" : ""}>
            <CardHeader>
              <CardTitle className="text-base">المحادثات</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[60vh] space-y-2 overflow-y-auto">
              {activeThreads.length === 0 ? (
                <EmptyState
                  icon={MessagesSquare}
                  title="لا توجد محادثات"
                  message="ستظهر المحادثات هنا عند ورود رسائل"
                />
              ) : (
                activeThreads.map((t) => {
                  const last = t.messages.reduce((a, b) =>
                    a.createdAt > b.createdAt ? a : b
                  );
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSelectedKey(t.key)}
                      className={`w-full rounded-md border p-3 text-start transition-colors ${
                        selectedKey === t.key
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {threadTitle(t, user?.id)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(last.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {last.sender.id === user?.id
                            ? "أنت"
                            : last.sender.name}
                          : {last.content}
                        </span>
                        <Badge variant="secondary" className="shrink-0">
                          {t.messages.length}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className={selectedThread ? "" : "hidden md:block"}>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setSelectedKey(null)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">
                {selectedThread
                  ? threadTitle(selectedThread, user?.id)
                  : "اختر محادثة"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedThread ? (
                <EmptyState
                  icon={MessagesSquare}
                  title="لم يتم اختيار محادثة"
                  message="اختر محادثة من القائمة لعرض رسائلها"
                />
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-md border p-3">
                    {threadMessages.map((m) => {
                      const isMine = m.sender.id === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={`rounded-md border p-3 ${
                            isMine
                              ? "border-primary/40 bg-primary/10"
                              : "bg-muted/40"
                          }`}
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {isMine ? "أنت" : m.sender.name}
                            </span>
                            <Badge variant={isMine ? "default" : "secondary"}>
                              {roleLabels[m.sender.role] ?? m.sender.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(m.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm">{m.content}</p>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleReply} className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="اكتب ردك هنا..."
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <Button type="submit" disabled={sending || !reply.trim()}>
                        <Send className="h-4 w-4" />
                        {sending ? "جارٍ الإرسال..." : "رد"}
                      </Button>
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
