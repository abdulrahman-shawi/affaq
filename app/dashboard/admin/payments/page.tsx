"use client";

import { useMemo, useState } from "react";
import { Plus, CreditCard, Banknote, Landmark, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { studentPaymentSummaryColumns } from "@/components/tables/Columns";
import PaymentForm from "@/components/forms/PaymentForm";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrency } from "@/app/lib/utils";
import type { StudentPaymentsSummary } from "@/types";

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

  // تجميع فواتير كل طالب في صف واحد — إجمالي المدفوع والمستحق والمتبقي
  const summaries = useMemo<StudentPaymentsSummary[]>(() => {
    const byStudent = new Map<string, StudentPaymentsSummary>();
    for (const p of filtered) {
      let s = byStudent.get(p.studentId);
      if (!s) {
        s = {
          studentId: p.studentId,
          studentName: p.student?.user?.name ?? "—",
          payments: [],
          invoiceCount: 0,
          totalPaid: 0,
          totalDue: null,
          remaining: null,
        };
        byStudent.set(p.studentId, s);
      }
      s.payments.push(p);
      s.invoiceCount += 1;
      s.totalPaid += p.amount;
      if (p.dueAmount != null) s.totalDue = (s.totalDue ?? 0) + p.dueAmount;
    }
    for (const s of Array.from(byStudent.values())) {
      s.remaining = s.totalDue != null ? Math.max(0, s.totalDue - s.totalPaid) : null;
    }
    return Array.from(byStudent.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName, "ar")
    );
  }, [filtered]);

  const total = filtered.reduce((sum, p) => sum + p.amount, 0);
  const bank = filtered
    .filter((p) => p.method === "bank")
    .reduce((sum, p) => sum + p.amount, 0);
  const cash = filtered
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + p.amount, 0);
  const remainingTotal = summaries.reduce((sum, s) => sum + (s.remaining ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي المدفوعات"
          value={formatCurrency(total)}
          icon={CreditCard}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="تحويل بنكي"
          value={formatCurrency(bank)}
          icon={Landmark}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="نقدي"
          value={formatCurrency(cash)}
          icon={Banknote}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          title="إجمالي المتبقي"
          value={formatCurrency(remainingTotal)}
          icon={Wallet}
          iconClassName="text-red-600"
          iconBgClassName="bg-red-500/10"
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
        columns={studentPaymentSummaryColumns()}
        data={summaries}
        loading={loading}
        emptyTitle="لا توجد مدفوعات"
        emptyMessage="لم يتم تسجيل أي دفعة بعد"
        searchValue={(s) => s.studentName}
        searchPlaceholder="ابحث باسم الطالب..."
        csv={{
          filename: "المدفوعات.csv",
          headers: [
            "الطالب",
            "عدد الفواتير",
            "إجمالي المدفوع",
            "إجمالي المستحق",
            "المتبقي",
          ],
          row: (s) => [
            s.studentName,
            s.invoiceCount,
            s.totalPaid,
            s.totalDue ?? "",
            s.remaining ?? "",
          ],
        }}
      />
    </div>
  );
}
