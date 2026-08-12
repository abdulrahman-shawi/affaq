"use client";

import { useEffect, useMemo, useState } from "react";
import { Video } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/app/lib/utils";
import type { ClassLevelDTO, SessionDTO, StudentDTO } from "@/types";

export default function StudentRecordingsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [classOrder, setClassOrder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [studentsRes, classesRes, sessionsRes] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/classes"),
          fetch("/api/sessions"),
        ]);
        const students: StudentDTO[] = studentsRes.ok
          ? await studentsRes.json()
          : [];
        const classes: ClassLevelDTO[] = classesRes.ok
          ? await classesRes.json()
          : [];
        const me = students.find((s) => s.userId === user.id);
        // Session.grade يقابل ClassLevel.order (نفس اتفاق SessionForm)
        const order =
          classes.find((c) => c.id === me?.classId)?.order ?? null;
        setClassOrder(order);
        setSessions(sessionsRes.ok ? await sessionsRes.json() : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // تسجيلات صفّ الطالب فقط، مجمّعة حسب المادة
  const bySubject = useMemo(() => {
    const groups = new Map<string, SessionDTO[]>();
    for (const session of sessions) {
      if (classOrder === null || session.grade !== classOrder) continue;
      if (!session.recordingUrl) continue;
      const list = groups.get(session.subject) ?? [];
      list.push(session);
      groups.set(session.subject, list);
    }
    return Array.from(groups.entries());
  }, [sessions, classOrder]);

  if (loading) {
    return <Loading label="جارٍ تحميل التسجيلات..." />;
  }

  if (bySubject.length === 0) {
    return (
      <EmptyState
        icon={Video}
        title="لا توجد تسجيلات بعد"
        message="ستظهر تسجيلات حصص صفّك هنا عند إضافتها من قبل المعلم"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">مكتبة التسجيلات</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bySubject.map(([subject, subjectSessions]) => (
          <Card key={subject}>
            <CardHeader>
              <CardTitle>{subject}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjectSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {formatDate(session.date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.teacher?.user?.name}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={session.recordingUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video className="h-4 w-4" />
                      مشاهدة
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
