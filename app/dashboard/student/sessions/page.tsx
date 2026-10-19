"use client";

import { Video, CheckCircle2, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { SessionJoinButton } from "@/components/shared/TodaySessionsCard";
import { useTodaySessions } from "@/hooks/useTodaySessions";
import { useMemo } from "react";

function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function StudentSessionsPage() {
  const { sessions, attendedIds, loading, joining, join } = useTodaySessions();

  const sorted = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [sessions]
  );

  // عدد حصص اليوم التي سجّل الطالب حضوره فيها
  const attendedCount = useMemo(
    () => sorted.filter((s) => attendedIds.has(s.id)).length,
    [sorted, attendedIds]
  );

  if (loading) {
    return <Loading label="جارٍ تحميل حصص اليوم..." />;
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Video}
        title="لا توجد حصص اليوم"
        message="ستظهر حصص صفّك المجدولة اليوم هنا عند إنشائها من قبل المعلم"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">حصصي — اليوم</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="حصص اليوم"
          value={sorted.length}
          icon={Video}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="سجّلت حضوري"
          value={attendedCount}
          icon={CheckCircle2}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="لم أسجّل بعد"
          value={sorted.length - attendedCount}
          icon={Clock}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((session) => {
          const attended = attendedIds.has(session.id);
          return (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{session.subject}</CardTitle>
                  {attended && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      حاضر
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{session.teacher?.user?.name ?? "—"}</p>
                  <p dir="ltr" className="text-right">
                    {formatTime(session.date)}
                  </p>
                </div>
                <SessionJoinButton
                  session={session}
                  attended={attended}
                  joining={joining === session.id}
                  onJoin={join}
                  className="w-full"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
