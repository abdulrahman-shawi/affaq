"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Loading from "@/components/shared/Loading";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = "لا توجد بيانات",
  emptyMessage,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  searchValue,
  searchPlaceholder = "بحث...",
  actions,
  actionsHeader = "الإجراءات",
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  /** عدد الصفوف الافتراضي في الصفحة */
  pageSize?: number;
  /** نص قابل للبحث لكل صف — تمريره يفعّل حقل البحث */
  searchValue?: (row: T) => string;
  searchPlaceholder?: string;
  /** إجراءات كل صف — يمكن تمرير أكثر من زر داخلها */
  actions?: (row: T) => ReactNode;
  actionsHeader?: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchValue) return data;
    return data.filter((row) => searchValue(row).toLowerCase().includes(q));
  }, [data, query, searchValue]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageData = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  if (loading) return <Loading />;
  if (data.length === 0)
    return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
          {searchValue ? (
            <div className="relative w-full max-w-sm">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="pr-9"
              />
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>عرض</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>صفوف</span>
          </div>
        </div>

      {filtered.length === 0 ? (
        <EmptyState title="لا توجد نتائج" message={`لا نتائج مطابقة لـ "${query}"`} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
              {actions && <TableHead className="w-px">{actionsHeader}</TableHead>}
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
                {actions && (
                  <TableCell>
                    <div className="flex items-center gap-2">{actions(row)}</div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
