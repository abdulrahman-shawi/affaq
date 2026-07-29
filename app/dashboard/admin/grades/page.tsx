"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import type { GradeDTO } from "@/types";

export default function AdminGradesPage() {
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
    <DataTable
      columns={gradeColumns()}
      data={grades}
      loading={loading}
      emptyTitle="لا توجد درجات"
      emptyMessage="لم يتم رصد أي درجة بعد"
    />
  );
}
