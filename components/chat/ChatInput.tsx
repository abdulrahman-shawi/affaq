"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import type { ChatMessageDTO } from "@/hooks/useChat";

export default function ChatInput({
  replyTo,
  onCancelReply,
  onSend,
}: {
  replyTo: ChatMessageDTO | null;
  onCancelReply: () => void;
  onSend: (input: {
    content?: string;
    imageUrl?: string;
    replyToId?: string;
  }) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const doSend = async (input: {
    content?: string;
    imageUrl?: string;
    replyToId?: string;
  }) => {
    setSending(true);
    try {
      await onSend(input);
      setText("");
      onCancelReply();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "فشل في إرسال الرسالة",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const sendText = () => {
    const t = text.trim();
    if (!t || sending) return;
    doSend({ content: t, replyToId: replyTo?.id });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || sending) return;
    setSending(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      const caption = text.trim();
      await onSend({
        imageUrl: blob.url,
        content: caption || undefined,
        replyToId: replyTo?.id,
      });
      setText("");
      onCancelReply();
    } catch {
      toast({ title: "فشل في رفع الصورة", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t bg-card">
      {replyTo && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border-s-[3px] border-emerald-500 bg-emerald-50 px-3 py-1.5">
          {replyTo.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={replyTo.imageUrl}
              alt=""
              className="h-10 w-10 flex-none rounded-md object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-emerald-700">
              {replyTo.sender.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {replyTo.content || "صورة"}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground"
            aria-label="إلغاء الرد"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          className="flex-none text-muted-foreground transition-colors hover:text-emerald-600 disabled:opacity-50"
          aria-label="إرفاق صورة"
        >
          <ImagePlus className="h-6 w-6" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendText();
          }}
          placeholder="مراسلة"
          disabled={sending}
          className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={sendText}
          disabled={sending || !text.trim()}
          className="flex-none text-emerald-600 transition-colors hover:text-emerald-700 disabled:opacity-40"
          aria-label="إرسال"
        >
          {sending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Send className="h-6 w-6 -scale-x-100" />
          )}
        </button>
      </div>
    </div>
  );
}
