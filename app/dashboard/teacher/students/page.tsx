"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/tables/DataTable";
import { studentBasicColumns } from "@/components/tables/Columns";
import { useStudents } from "@/hooks/useStudents";

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function TeacherStudentsPage() {
  const { students, loading } = useStudents();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const classNames = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.class?.name).filter(Boolean))
      ) as string[],
    [students]
  );

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          (classFilter === "all" || s.class?.name === classFilter) &&
          (s.user?.name?.includes(search) || s.user?.email?.includes(search))
      ),
    [students, search, classFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث عن طالب..."
            className="pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={selectClassName}
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="all">كل الصفوف</option>
          {classNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={studentBasicColumns()}
        data={filtered}
        loading={loading}
        emptyTitle="لا يوجد طلاب"
      />
    </div>
  );
}
