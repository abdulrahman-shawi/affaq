"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/tables/DataTable";
import { teacherColumns } from "@/components/tables/Columns";
import TeacherForm from "@/components/forms/TeacherForm";
import type { TeacherDTO } from "@/types";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers");
      setTeachers(res.ok ? await res.json() : []);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <TeacherForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة معلم
            </Button>
          }
        />
      </div>

      <DataTable
        columns={teacherColumns()}
        data={teachers}
        loading={loading}
        emptyTitle="لا يوجد معلمون"
        emptyMessage="ابدأ بإضافة أول معلم"
      />
    </div>
  );
}
