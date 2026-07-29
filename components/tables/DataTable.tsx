"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

const PAGE_SIZE = 10;

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = "لا توجد بيانات",
  emptyMessage,
  pageSize = PAGE_SIZE,
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageData = useMemo(
    () => data.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [data, currentPage, pageSize]
  );

  if (loading) return <Loading />;
  if (data.length === 0)
    return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.header} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageData.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.header} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
