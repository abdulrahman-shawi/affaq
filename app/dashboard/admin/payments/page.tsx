"use client";

import { useMemo, useState } from "react";
import { Plus, CreditCard, Banknote, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { paymentColumns } from "@/components/tables/Columns";
import PaymentForm from "@/components/forms/PaymentForm";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrency, formatDate } from "@/app/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  bank: "تحويل بنكي",
  cash: "نقدي",
};

const PERIOD_LABELS: Record<string, string> = {
  year: "سنوي",
  semester: "فصلي",
  monthly: "شهري",
};

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function AdminPaymentsPage() {
  const { payments, loading, refetch } = usePayments();
  const [methodFilter, setMethodFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const filtered = useMemo(
    () =>
      payments.filter(
        (p) =>
          (methodFilter === "all" || p.method === methodFilter) &&
          (periodFilter === "all" || p.period === periodFilter)
      ),
    [payments, methodFilter, periodFilter]
  );

  const total = filtered.reduce((sum, p) => sum + p.amount, 0);
  const bank = filtered
    .filter((p) => p.method === "bank")
    .reduce((sum, p) => sum + p.amount, 0);
  const cash = filtered
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="إجمالي المدفوعات"
          value={formatCurrency(total)}
          icon={CreditCard}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="تحويل بنكي"
          value={formatCurrency(bank)}
          icon={Landmark}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="نقدي"
          value={formatCurrency(cash)}
          icon={Banknote}
          iconClassName="text-blue-600"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <select
            className={selectClassName}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">كل طرق الدفع</option>
            {Object.entries(METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={selectClassName}
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="all">كل الفترات</option>
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <PaymentForm
          onSuccess={refetch}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              تسجيل دفعة
            </Button>
          }
        />
      </div>

      <DataTable
        columns={paymentColumns()}
        data={filtered}
        loading={loading}
        emptyTitle="لا توجد مدفوعات"
        emptyMessage="لم يتم تسجيل أي دفعة بعد"
        searchValue={(p) => p.student?.user?.name ?? ""}
        searchPlaceholder="ابحث باسم الطالب..."
        csv={{
          filename: "المدفوعات.csv",
          headers: [
            "التاريخ",
            "الطالب",
            "المبلغ",
            "طريقة الدفع",
            "الفترة",
            "الأشهر",
            "ملاحظة",
          ],
          row: (p) => [
            formatDate(p.date),
            p.student?.user?.name,
            p.amount,
            METHOD_LABELS[p.method] ?? p.method,
            PERIOD_LABELS[p.period] ?? p.period,
            p.months,
            p.note,
          ],
        }}
      />
    </div>
  );
}
