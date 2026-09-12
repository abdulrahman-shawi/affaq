"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// مسجّل صوت داخل المتصفح عبر MediaRecorder — يُرجع التسجيل كملف File جاهز للرفع
export default function AudioRecorder({
  onRecorded,
  onClear,
}: {
  onRecorded: (file: File) => void;
  onClear?: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // تنظيف المؤقت وعنوان المعاينة عند إزالة المكوّن
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // بعض المتصفحات تسجّل بصيغة video/webm رغم كون المحتوى صوتًا فقط — مقبولة في الرفع
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = recorder.mimeType || "audio/webm";
        const ext = type.includes("ogg")
          ? "ogg"
          : type.includes("mp4")
            ? "m4a"
            : "webm";
        const name = `recording-${Date.now()}.${ext}`;
        const file = new File([new Blob(chunksRef.current, { type })], name, {
          type,
        });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(file));
        setFileName(name);
        onRecorded(file);
      };
      recorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError(
        "تعذّر الوصول إلى الميكروفون — تأكد من منح الإذن للمتصفح ثم أعد المحاولة"
      );
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function clearRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setFileName(null);
    setElapsed(0);
    setError(null);
    onClear?.();
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {audioUrl ? (
        <div className="flex items-center gap-2">
          <audio controls src={audioUrl} className="h-9 flex-1" dir="ltr" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="حذف التسجيل"
            onClick={clearRecording}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {recording ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4" />
              إيقاف
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startRecording}
            >
              <Mic className="h-4 w-4" />
              تسجيل
            </Button>
          )}
          {recording && (
            <span
              className="flex items-center gap-1 text-sm font-semibold text-destructive"
              dir="ltr"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>
      )}
      {audioUrl && fileName && (
        <p className="text-xs text-muted-foreground" dir="ltr">
          {fileName}
        </p>
      )}
    </div>
  );
}
