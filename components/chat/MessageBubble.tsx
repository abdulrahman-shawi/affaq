"use client";

import { useRef, useState } from "react";
import { Reply } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ChatMessageDTO } from "@/hooks/useChat";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const SENDER_COLORS = [
  "text-violet-600",
  "text-blue-600",
  "text-emerald-600",
  "text-rose-600",
  "text-amber-600",
  "text-cyan-600",
];

function senderColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return SENDER_COLORS[Math.abs(h) % SENDER_COLORS.length];
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ar", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function QuoteBlock({
  senderName,
  text,
  imageUrl,
}: {
  senderName: string;
  text: string | null;
  imageUrl: string | null;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2 rounded-md border-s-[3px] border-emerald-500 bg-black/5 px-2 py-1">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-11 w-11 flex-none rounded-md object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-emerald-700">
          {senderName}
        </div>
        <div className="line-clamp-2 text-xs text-muted-foreground">
          {text || "صورة"}
        </div>
      </div>
    </div>
  );
}

export default function MessageBubble({
  message,
  isMine,
  showSender,
  onReply,
  onReact,
  onImageClick,
}: {
  message: ChatMessageDTO;
  isMine: boolean;
  showSender: boolean;
  onReply: (m: ChatMessageDTO) => void;
  onReact: (messageId: string, emoji: string) => void;
  onImageClick: (url: string) => void;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const gesture = useRef({
    sx: 0,
    sy: 0,
    dx: 0,
    dragging: false,
    longFired: false,
    longTimer: null as ReturnType<typeof setTimeout> | null,
  });

  const g = gesture.current;

  const onPointerDown = (e: React.PointerEvent) => {
    g.sx = e.clientX;
    g.sy = e.clientY;
    g.dx = 0;
    g.dragging = false;
    g.longFired = false;
    g.longTimer = setTimeout(() => {
      g.longFired = true;
      setPickerOpen(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 450);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (g.sx === 0) return;
    const mx = e.clientX - g.sx;
    const my = e.clientY - g.sy;
    if (Math.abs(my) > 10 && !g.dragging && g.longTimer) {
      clearTimeout(g.longTimer);
    }
    // السحب لليسار للرد (واجهة RTL)
    if (mx < -8 && !g.longFired) {
      g.dragging = true;
      if (g.longTimer) clearTimeout(g.longTimer);
      g.dx = Math.max(mx, -90);
      if (bubbleRef.current) {
        bubbleRef.current.style.transform = `translateX(${g.dx}px)`;
      }
      setHintVisible(g.dx < -45);
    }
  };

  const endGesture = () => {
    if (g.longTimer) clearTimeout(g.longTimer);
    if (bubbleRef.current) bubbleRef.current.style.transform = "";
    setHintVisible(false);
    if (g.dragging && g.dx < -60) onReply(message);
    g.sx = 0;
    g.dragging = false;
  };

  return (
    <div className={cn("relative flex gap-2 px-3 py-1", isMine && "flex-row-reverse")}>
      {/* أيقونة تلميح السحب */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-emerald-500 transition-opacity",
          isMine ? "-right-1" : "-left-1",
          hintVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <Reply className="h-5 w-5" />
      </div>

      {!isMine && (
        <div className="flex h-8 w-8 flex-none items-center justify-center self-end rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {message.sender.name.charAt(0)}
        </div>
      )}

      <div className="max-w-[78%]">
        {!isMine && showSender && (
          <div
            className={cn(
              "mb-0.5 px-1 text-xs font-semibold",
              senderColor(message.sender.id)
            )}
          >
            {message.sender.name}
          </div>
        )}

        <div className="relative">
          {pickerOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setPickerOpen(false)}
              />
              <div
                dir="ltr"
                className="absolute -top-11 z-30 flex gap-1 rounded-full border bg-card p-1.5 shadow-lg start-0"
              >
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="rounded-full p-1 text-lg leading-none transition-transform hover:scale-125"
                    onClick={() => {
                      onReact(message.id, e);
                      setPickerOpen(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}

          <div
            ref={bubbleRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            onDoubleClick={(e) => {
              e.preventDefault();
              onReact(message.id, "❤️");
            }}
            className={cn(
              "select-none break-words rounded-xl border px-3 py-2 text-sm leading-relaxed transition-transform [touch-action:pan-y]",
              isMine
                ? "rounded-es-sm border-emerald-200 bg-emerald-50"
                : "rounded-ee-sm bg-card"
            )}
          >
            {message.replyTo && (
              <QuoteBlock
                senderName={message.replyTo.senderName}
                text={message.replyTo.content}
                imageUrl={message.replyTo.imageUrl}
              />
            )}
            {message.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.imageUrl}
                alt="صورة مرفقة"
                onClick={() => onImageClick(message.imageUrl!)}
                className="mb-1.5 block w-full max-w-[260px] cursor-pointer rounded-lg"
              />
            )}
            {message.content}
            <div className="mt-1 text-end text-[11px] text-muted-foreground">
              {formatTime(message.createdAt)}
            </div>
          </div>
        </div>

        {message.reactions.length > 0 && (
          <div
            className={cn(
              "relative z-10 -mt-1.5 flex flex-wrap gap-1",
              isMine ? "justify-start ps-2" : "justify-start ps-2"
            )}
          >
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(message.id, r.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] text-muted-foreground shadow-sm",
                  r.mine && "border-emerald-400 bg-emerald-50"
                )}
              >
                <span className="text-[13px]">{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
