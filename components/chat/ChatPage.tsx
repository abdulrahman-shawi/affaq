"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ImageIcon, Loader2, MessagesSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useChatList,
  useClassChat,
  type ChatMessageDTO,
} from "@/hooks/useChat";
import { cn } from "@/app/lib/utils";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "full" }).format(
    new Date(iso)
  );
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function Conversation({
  classId,
  className,
  viewerId,
  onBack,
}: {
  classId: string;
  className: string;
  viewerId: string;
  onBack?: () => void;
}) {
  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    live,
    loadOlder,
    sendMessage,
    toggleReaction,
  } = useClassChat(classId, viewerId);
  const [replyTo, setReplyTo] = useState<ChatMessageDTO | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // التمرير لأسفل عند وصول رسائل جديدة إن كان المستخدم قريباً من الأسفل
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {className.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{className}</div>
          <div className="text-[11px] text-muted-foreground">
            {live ? "متصل مباشرة" : "دردشة الصف"}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] [background-size:20px_20px]"
      >
        {loading ? (
          <Loading label="جارٍ تحميل الرسائل..." />
        ) : error ? (
          <EmptyState title="تعذّر التحميل" message={error} />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="لا رسائل بعد"
            message="ابدأ المحادثة بإرسال رسالة أو صورة واجب"
          />
        ) : (
          <div className="flex flex-col gap-0.5 py-3">
            {hasMore && (
              <button
                type="button"
                onClick={loadOlder}
                disabled={loadingOlder}
                className="mx-auto mb-2 flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted/70"
              >
                {loadingOlder && <Loader2 className="h-3 w-3 animate-spin" />}
                تحميل رسائل أقدم
              </button>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDate = !prev || !sameDay(prev.createdAt, m.createdAt);
              const showSender =
                showDate || !prev || prev.sender.id !== m.sender.id;
              return (
                <div key={m.id}>
                  {showDate && (
                    <div className="my-2 self-center">
                      <span className="mx-auto block w-fit rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                        {dayLabel(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={m}
                    isMine={m.sender.id === viewerId}
                    showSender={showSender}
                    onReply={setReplyTo}
                    onReact={toggleReaction}
                    onImageClick={setLightbox}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ChatInput
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={sendMessage}
      />

      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          {lightbox && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox}
              alt="صورة مرفقة"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { chats, loading, error } = useChatList();
  const [selected, setSelected] = useState<string | null>(null);

  // الطالب له صف واحد عادة — يُفتح مباشرة
  useEffect(() => {
    if (!selected && chats.length === 1) setSelected(chats[0].classId);
  }, [chats, selected]);

  if (authLoading || loading) {
    return <Loading label="جارٍ تحميل المحادثات..." />;
  }
  if (error) {
    return <EmptyState title="تعذّر التحميل" message={error} />;
  }
  if (!user) return null;

  const current = chats.find((c) => c.classId === selected);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        "h-[calc(100dvh-7rem)]"
      )}
    >
      {current ? (
        <Conversation
          classId={current.classId}
          className={current.className}
          viewerId={user.id}
          onBack={chats.length > 1 ? () => setSelected(null) : undefined}
        />
      ) : chats.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="لا توجد محادثات"
          message="لم يتم تعيينك في أي صف بعد"
        />
      ) : (
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-3 text-sm font-semibold">
            المحادثات
          </div>
          <div className="flex-1 divide-y overflow-y-auto">
            {chats.map((c) => (
              <button
                key={c.classId}
                type="button"
                onClick={() => setSelected(c.classId)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50"
              >
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {c.className.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.className}</div>
                  {c.lastMessage ? (
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {c.lastMessage.imageUrl && (
                        <ImageIcon className="h-3.5 w-3.5 flex-none" />
                      )}
                      <span className="truncate">
                        {c.lastMessage.senderName}: {" "}
                        {c.lastMessage.content ||
                          (/\.(mp3|wav|m4a|aac|ogg|oga|webm)(\?.*)?$/i.test(
                            c.lastMessage.imageUrl ?? ""
                          )
                            ? "رسالة صوتية"
                            : /\.(mp4|mov|webm|avi|mkv|3gp)(\?.*)?$/i.test(
                                c.lastMessage.imageUrl ?? ""
                              )
                              ? "فيديو"
                              : "مرفق")}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      لا رسائل بعد
                    </div>
                  )}
                </div>
                {c.lastMessage && (
                  <div className="flex-none text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat("ar", {
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(c.lastMessage.createdAt))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
