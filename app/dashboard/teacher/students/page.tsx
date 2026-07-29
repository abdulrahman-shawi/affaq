"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/tables/DataTable";
import { studentColumns } from "@/components/tables/Columns";
import { useStudents } from "@/hooks/useStudents";

export default function TeacherStudentsPage() {
  const { students, loading } = useStudents();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.user?.name?.includes(search) || s.user?.email?.includes(search)
      ),
    [students, search]
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث عن طالب..."
          className="pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={studentColumns()}
        data={filtered}
        loading={loading}
        emptyTitle="لا يوجد طلاب"
      />
    </div>
  );
}
