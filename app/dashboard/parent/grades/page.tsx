"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import type { GradeDTO } from "@/types";

export default function ParentGradesPage() {
  const { user } = useAuth();
  const { students } = useStudents();
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

  const childrenIds = useMemo(
    () =>
      students
        .filter((s) => s.parent?.userId === user?.id)
        .map((s) => s.id),
    [students, user]
  );

  const childrenGrades = useMemo(
    () => grades.filter((g) => childrenIds.includes(g.studentId)),
    [grades, childrenIds]
  );

  return (
    <DataTable
      columns={gradeColumns()}
      data={childrenGrades}
      loading={loading}
      emptyTitle="لا توجد درجات"
    />
  );
}
