"use client";

import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
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
  const times = Array.from(new Set(slots.map((s) => s.startTime))).sort();

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-right font-medium">الوقت</th>
            {days.map((day) => (
              <th key={day} className="p-3 font-medium">
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => (
            <tr key={time} className="border-b last:border-0">
              <td className="whitespace-nowrap p-3 font-medium" dir="ltr">
                {time}
              </td>
              {days.map((day) => {
                const slot = slots.find(
                  (s) => s.dayOfWeek === day && s.startTime === time
                );
                return (
                  <td key={day} className="min-w-32 p-2 align-top">
                    {slot && (
                      <div className="space-y-1 rounded-md bg-primary/10 p-2">
                        <p className="font-medium">{slot.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {slot.teacher?.user?.name}
                        </p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {slot.startTime} - {slot.endTime}
                        </p>
                        {renderActions && (
                          <div className="flex gap-1">{renderActions(slot)}</div>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
