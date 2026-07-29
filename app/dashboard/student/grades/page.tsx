"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/tables/DataTable";
import { gradeColumns } from "@/components/tables/Columns";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import type { GradeDTO } from "@/types";

export default function StudentGradesPage() {
  const { user } = useAuth();
  const { students } = useStudents();
  const [grades, setGrades] = useState<GradeDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/grades")
      .then((res) => (res.ok ? res.json() : []))
      .then(setGrades)
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
  }, []);

  const me = useMemo(
    () => students.find((s) => s.userId === user?.id),
    [students, user]
  );

  const myGrades = useMemo(
    () => grades.filter((g) => g.studentId === me?.id),
    [grades, me]
  );

  return (
    <DataTable
      columns={gradeColumns()}
      data={myGrades}
      loading={loading}
      emptyTitle="لا توجد درجات بعد"
    />
  );
}
