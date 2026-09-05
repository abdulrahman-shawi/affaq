"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/app/lib/utils";
import type { PaymentDTO } from "@/types";

const methodLabels: Record<string, string> = { bank: "تحويل بنكي", cash: "نقدي" };
const periodLabels: Record<string, string> = {
  year: "سنوي",
  semester: "فصلي",
  monthly: "شهري",
};

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
}

export default function StudentPaymentsDialog({
  studentName,
  payments,
  trigger,
}: {
  studentName: string;
  /** كل فواتير الطالب — تُعرض مرتبة من الأحدث للأقدم */
  payments: PaymentDTO[];
  trigger: React.ReactNode;
}) {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>فواتير الطالب: {studentName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المبلغ المدفوع</TableHead>
                <TableHead>المبلغ المستحق</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>الفترة</TableHead>
                <TableHead>الإشعار</TableHead>
                <TableHead>ملاحظة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => {
                const remaining =
                  p.dueAmount != null ? Math.max(0, p.dueAmount - p.amount) : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      {p.dueAmount != null ? formatCurrency(p.dueAmount) : "—"}
                    </TableCell>
                    <TableCell>
                      {remaining == null ? (
                        "—"
                      ) : remaining > 0 ? (
                        <Badge variant="destructive">
                          {formatCurrency(remaining)}
                        </Badge>
                      ) : (
                        <Badge variant="success">مكتمل</Badge>
                      )}
                    </TableCell>
                    <TableCell>{methodLabels[p.method] ?? p.method}</TableCell>
                    <TableCell>{periodLabels[p.period] ?? p.period}</TableCell>
                    <TableCell>
                      {p.receiptUrl ? (
                        isImageUrl(p.receiptUrl) ? (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.receiptUrl}
                              alt="إشعار الدفع"
                              className="h-14 w-14 rounded-md border object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            عرض
                          </a>
                        )
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{p.note ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
