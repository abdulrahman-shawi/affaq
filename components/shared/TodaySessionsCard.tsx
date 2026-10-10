"use client";

import Link from "next/link";
import { CheckCircle2, Video } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { useTodaySessions } from "@/hooks/useTodaySessions";
import type { SessionDTO } from "@/types";

function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function SessionJoinButton({
  session,
  attended,
  joining,
  onJoin,
  className,
}: {
  session: SessionDTO;
  attended: boolean;
  joining: boolean;
  onJoin: (session: SessionDTO) => void;
  className?: string;
}) {
  if (attended) {
    return session.zoomLink ? (
      <Button asChild variant="outline" className={className}>
        <a href={session.zoomLink} target="_blank" rel="noopener noreferrer">
          <Video className="h-4 w-4" />
          إعادة الدخول للحصة
        </a>
      </Button>
    ) : null;
  }
  return (
    <Button className={className} onClick={() => onJoin(session)} disabled={joining}>
      <Video className="h-4 w-4" />
      {joining ? "جارٍ الدخول..." : "دخول الحصة"}
    </Button>
  );
}

/** بطاقة حصص اليوم — تظهر في الصفحة الرئيسية لداشبورد الطالب للدخول السريع */
export default function TodaySessionsCard() {
  const { sessions, attendedIds, loading, joining, join } = useTodaySessions();

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">حصص اليوم</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/student/sessions">صفحة حصصي</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading label="جارٍ تحميل حصص اليوم..." />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Video}
            title="لا توجد حصص اليوم"
            message="ستظهر حصص صفّك المجدولة اليوم هنا عند إنشائها من قبل المعلم"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((session) => {
              const attended = attendedIds.has(session.id);
              return (
                <div
                  key={session.id}
                  className="flex flex-col justify-between gap-3 rounded-md border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{session.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.teacher?.user?.name ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {attended && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          حاضر
                        </Badge>
                      )}
                      <Badge variant="secondary" dir="ltr">
                        {formatTime(session.date)}
                      </Badge>
                    </div>
                  </div>
                  <SessionJoinButton
                    session={session}
                    attended={attended}
                    joining={joining === session.id}
                    onJoin={join}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
