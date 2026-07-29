"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import GradeForm from "@/components/forms/GradeForm";
import type { GradeDTO } from "@/types";

export default function TeacherGradesPage() {
  const [grades, setGrades] = useState<GradeDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grades");
      setGrades(res.ok ? await res.json() : []);
    } catch {
      setGrades([]);
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
        <GradeForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              رصد درجة
            </Button>
          }
        />
      </div>

      <DataTable
        columns={gradeColumns()}
        data={grades}
        loading={loading}
        emptyTitle="لا توجد درجات"
        emptyMessage="ابدأ برصد أول درجة"
      />
    </div>
  );
}
