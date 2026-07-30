"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/tables/DataTable";
import { parentColumns } from "@/components/tables/Columns";
import ParentForm from "@/components/forms/ParentForm";
import type { ParentDTO } from "@/types";

export default function AdminParentsPage() {
  const [parents, setParents] = useState<ParentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parents");
      setParents(res.ok ? await res.json() : []);
    } catch {
      setParents([]);
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
        <ParentForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              إضافة ولي أمر
            </Button>
          }
        />
      </div>

      <DataTable
        columns={parentColumns()}
        data={parents}
        loading={loading}
        emptyTitle="لا يوجد أولياء أمور"
        emptyMessage="ابدأ بإضافة أول ولي أمر"
        searchValue={(p) =>
          [p.user?.name, p.user?.email, p.user?.phone].filter(Boolean).join(" ")
        }
        searchPlaceholder="ابحث بالاسم أو البريد أو الهاتف..."
      />
    </div>
  );
}
