"use client";

import { useMemo } from "react";
import DataTable from "@/components/tables/DataTable";
import { studentColumns } from "@/components/tables/Columns";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";

export default function ParentChildrenPage() {
  const { user } = useAuth();
  const { students, loading } = useStudents();

  const children = useMemo(
    () => students.filter((s) => s.parent?.userId === user?.id),
    [students, user]
  );

  return (
    <DataTable
      columns={studentColumns()}
      data={children}
      loading={loading}
      emptyTitle="لا يوجد أبناء مسجلون"
    />
  );
}
