"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Baby, CalendarCheck, ClipboardList, BadgeCheck, AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/shared/StatCard";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { formatDate } from "@/app/lib/utils";
import { statusLabels } from "@/components/tables/Columns";

export default function ParentDashboard() {
  const { user } = useAuth();
  const { students, loading } = useStudents();

  const children = useMemo(
    () => students.filter((s) => s.parent?.userId === user?.id),
    [students, user]
  );

  if (loading) return <Loading />;

  if (children.length === 0) {
    return (
      <EmptyState
        icon={Baby}
        title="لا يوجد أبناء مسجلون"
        message="تواصل مع إدارة الأكاديمية لربط حسابك بأبنائك"
      />
    );
  }

  const activeChildren = children.filter((c) => c.status === "active").length;
  const expiringSoon = children.filter((c) => {
    if (!c.subEndDate) return false;
    const days = Math.ceil(
      (new Date(c.subEndDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="عدد الأبناء"
          value={children.length}
          icon={Baby}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
        />
        <StatCard
          title="اشتراكات نشطة"
          value={activeChildren}
          icon={BadgeCheck}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          title="تنتهي خلال 30 يومًا"
          value={expiringSoon}
          icon={AlarmClock}
          iconClassName="text-rose-600"
          iconBgClassName="bg-rose-500/10"
          description={expiringSoon > 0 ? "يُنصح بالتجديد مبكرًا" : undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <Card key={child.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {child.user?.name}
                <Badge
                  variant={child.status === "active" ? "success" : "destructive"}
                >
                  {statusLabels[child.status] ?? child.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>الصف: {child.class?.name ?? "—"}</p>
              <p>نهاية الاشتراك: {formatDate(child.subEndDate)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">متابعة سريعة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/parent/attendance">
              <CalendarCheck className="h-4 w-4" />
              سجل الحضور
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/parent/grades">
              <ClipboardList className="h-4 w-4" />
              الدرجات
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
