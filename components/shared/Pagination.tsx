"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-4">
      <p className="text-sm text-muted-foreground">
        صفحة {page} من {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          التالي
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
