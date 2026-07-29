"use client";

import { Plus, CreditCard, Banknote, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/tables/DataTable";
import { paymentColumns } from "@/components/tables/Columns";
import PaymentForm from "@/components/forms/PaymentForm";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrency } from "@/app/lib/utils";

export default function AdminPaymentsPage() {
  const { payments, loading, refetch } = usePayments();

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const bank = payments
    .filter((p) => p.method === "bank")
    .reduce((sum, p) => sum + p.amount, 0);
  const cash = payments
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

      <div className="flex justify-end">
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
        data={payments}
        loading={loading}
        emptyTitle="لا توجد مدفوعات"
        emptyMessage="لم يتم تسجيل أي دفعة بعد"
      />
    </div>
  );
}
