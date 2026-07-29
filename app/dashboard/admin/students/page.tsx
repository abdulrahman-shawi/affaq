"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/tables/DataTable";
import { studentColumns } from "@/components/tables/Columns";
import StudentForm from "@/components/forms/StudentForm";
import { useStudents } from "@/hooks/useStudents";

export default function AdminStudentsPage() {
  const { students, loading, refetch } = useStudents();
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <StudentForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة طالب
            </Button>
          }
        />
      </div>

      <DataTable
        columns={studentColumns()}
        data={filtered}
        loading={loading}
        emptyTitle="لا يوجد طلاب"
        emptyMessage="ابدأ بإضافة أول طالب"
      />
    </div>
  );
}
