"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DataTable, { type Column } from "@/components/tables/DataTable";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { useAssignments } from "@/hooks/useAssignments";
import { formatDate } from "@/app/lib/utils";
import type { AssignmentDTO } from "@/types";

export default function StudentAssignmentsPage() {
  const { user } = useAuth();
  const { students } = useStudents();
  const { assignments, loading, refetch } = useAssignments();
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const me = useMemo(
    () => students.find((s) => s.userId === user?.id),
    [students, user]
  );

  async function handleSubmit(assignmentId: string) {
    if (!me) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          studentId: me.id,
          text: text || undefined,
        }),
      });
      if (!res.ok) throw new Error("فشل في تسليم الواجب");
      setOpenId(null);
      setText("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<AssignmentDTO>[] = [
    { header: "العنوان", cell: (a) => a.title },
    { header: "المادة", cell: (a) => a.subject },
    { header: "تاريخ التسليم", cell: (a) => formatDate(a.dueDate) },
    {
      header: "الحالة",
      cell: (a) => {
        const mine = a.submissions?.find((s) => s.studentId === me?.id);
        if (mine?.grade != null)
          return <Badge variant="success">مُقيّم: {mine.grade}</Badge>;
        if (mine) return <Badge variant="secondary">تم التسليم</Badge>;
        return <Badge variant="warning">لم يُسلّم</Badge>;
      },
    },
    {
      header: "إجراء",
      cell: (a) => {
        const mine = a.submissions?.find((s) => s.studentId === me?.id);
        if (mine) return null;
        return (
          <Dialog
            open={openId === a.id}
            onOpenChange={(open) => setOpenId(open ? a.id : null)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
                تسليم
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تسليم: {a.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="submission-text">نص الإجابة</Label>
                  <Input
                    id="submission-text"
                    placeholder="اكتب إجابتك هنا..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  className="w-full"
                  disabled={submitting}
                  onClick={() => handleSubmit(a.id)}
                >
                  {submitting ? "جارٍ التسليم..." : "تسليم الواجب"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={assignments}
      loading={loading}
      emptyTitle="لا توجد واجبات"
    />
  );
}
