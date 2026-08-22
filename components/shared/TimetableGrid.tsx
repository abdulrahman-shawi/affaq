"use client";

import type { ReactNode } from "react";
import { CalendarDays, Video } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import type { TimetableSlotDTO } from "@/types";

export const DAY_LABELS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

// الأسبوع الدراسي الافتراضي: الأحد–الخميس
const SCHOOL_DAYS = [0, 1, 2, 3, 4];

const HOUR_PX = 72;
const MIN_CARD_PX = 40;

// ألوان pastel لبطاقات الحصص — تُسند لكل مادة
const PALETTE = [
  "bg-emerald-50 border-emerald-300 text-emerald-900",
  "bg-sky-50 border-sky-300 text-sky-900",
  "bg-pink-50 border-pink-300 text-pink-900",
  "bg-violet-50 border-violet-300 text-violet-900",
  "bg-amber-50 border-amber-300 text-amber-900",
  "bg-teal-50 border-teal-300 text-teal-900",
  "bg-rose-50 border-rose-300 text-rose-900",
  "bg-indigo-50 border-indigo-300 text-indigo-900",
];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 13:30 → "1:30 م" */
function formatTime12(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 < 12 ? "ص" : "م";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function TimetableGrid({
  slots,
  renderActions,
}: {
  slots: TimetableSlotDTO[];
  renderActions?: (slot: TimetableSlotDTO) => ReactNode;
}) {
  if (slots.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="لا توجد حصص في الجدول"
        message="لم تُضف حصص أسبوعية بعد"
      />
    );
  }

  // نعرض أيام الأسبوع الدراسي، ونضيف أي يوم آخر توجد فيه حصص فعليًا
  const days = Array.from(
    new Set([...SCHOOL_DAYS, ...slots.map((s) => s.dayOfWeek)])
  ).sort((a, b) => a - b);

  // نطاق المحور الزمني: من أقرب بداية لأبعد نهاية (مقربًا للساعة)
  const minMinutes =
    Math.floor(Math.min(...slots.map((s) => toMinutes(s.startTime))) / 60) * 60;
  const maxMinutes =
    Math.ceil(Math.max(...slots.map((s) => toMinutes(s.endTime))) / 60) * 60;
  const totalHeight = ((maxMinutes - minMinutes) / 60) * HOUR_PX;

  const hourMarks: number[] = [];
  for (let t = minMinutes; t <= maxMinutes; t += 60) hourMarks.push(t);

  // لون ثابت لكل مادة
  const subjectColors = new Map<string, string>();
  for (const slot of slots) {
    if (!subjectColors.has(slot.subject)) {
      subjectColors.set(
        slot.subject,
        PALETTE[subjectColors.size % PALETTE.length]
      );
    }
  }

  const offsetTop = (time: string) =>
    ((toMinutes(time) - minMinutes) / 60) * HOUR_PX;

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="flex min-w-[720px]">
        {/* محور الوقت — يظهر يمينًا في RTL */}
        <div className="w-20 shrink-0">
          <div className="h-10 border-b" />
          <div className="relative" style={{ height: totalHeight }}>
            {hourMarks.map((t) => (
              <span
                key={t}
                className="absolute right-0 left-0 -translate-y-1/2 text-center text-[11px] text-muted-foreground"
                style={{ top: (t - minMinutes) / 60 * HOUR_PX }}
              >
                {formatTime12(t)}
              </span>
            ))}
          </div>
        </div>

        {days.map((day) => (
          <div key={day} className="flex-1 border-r last:border-r-0">
            <div className="flex h-10 items-center justify-center border-b bg-muted/40 text-sm font-medium">
              {DAY_LABELS[day]}
            </div>
            <div className="relative" style={{ height: totalHeight }}>
              {/* خطوط الساعات */}
              {hourMarks.map((t) => (
                <div
                  key={t}
                  className="absolute right-0 left-0 border-t border-dashed border-muted"
                  style={{ top: (t - minMinutes) / 60 * HOUR_PX }}
                />
              ))}

              {slots
                .filter((s) => s.dayOfWeek === day)
                .map((slot) => {
                  const height =
                    ((toMinutes(slot.endTime) - toMinutes(slot.startTime)) /
                      60) *
                    HOUR_PX;
                  return (
                    <div
                      key={slot.id}
                      className={`absolute right-1 left-1 overflow-hidden rounded-lg border p-1.5 text-[11px] leading-snug shadow-sm ${subjectColors.get(
                        slot.subject
                      )}`}
                      style={{
                        top: offsetTop(slot.startTime) + 2,
                        height: Math.max(height - 4, MIN_CARD_PX),
                      }}
                    >
                      <p className="truncate font-semibold">{slot.subject}</p>
                      <p className="truncate opacity-75">
                        {slot.teacher?.user?.name}
                      </p>
                      <p className="truncate opacity-75">
                        {formatTime12(toMinutes(slot.startTime))} -{" "}
                        {formatTime12(toMinutes(slot.endTime))}
                      </p>
                      {slot.zoomLink && (
                        <a
                          href={slot.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 rounded bg-white/70 px-1.5 py-0.5 font-medium text-sky-700 underline decoration-sky-400 underline-offset-2 hover:bg-white"
                        >
                          <Video className="h-3 w-3" />
                          انضم عبر زوم
                        </a>
                      )}
                      {renderActions && (
                        <div className="absolute left-1 top-1 flex gap-0.5">
                          {renderActions(slot)}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
