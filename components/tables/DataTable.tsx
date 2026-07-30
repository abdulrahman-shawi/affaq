"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  selectable = false,
  bulkActions,
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
  /** يفعّل checkbox بجانب كل صف */
  selectable?: boolean;
  /** شريط يظهر عند وجود صفوف محددة (إجراءات جماعية) */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<T>>(new Set());

  // إزالة الصفوف المحددة التي لم تعد موجودة في البيانات
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((r) => data.includes(r)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((row) => selected.has(row));

  function toggleRow(row: T) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allFilteredSelected ? new Set() : new Set(filtered));
  }

  const clearSelection = () => setSelected(new Set());

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
        <>
          {selectable && selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-4 py-2">
              <p className="text-sm font-medium">
                تم تحديد {selected.size}{" "}
                {selected.size === 1 ? "صف" : "صفوف"}
              </p>
              <div className="flex items-center gap-2">
                {bulkActions?.([...selected], clearSelection)}
              </div>
            </div>
          )}
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-primary"
                    aria-label="تحديد الكل"
                  />
                </TableHead>
              )}
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
                {selectable && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(row)}
                      onChange={() => toggleRow(row)}
                      className="h-4 w-4 accent-primary"
                      aria-label="تحديد الصف"
                    />
                  </TableCell>
                )}
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
        </>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
