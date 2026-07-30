import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

/**
 * حالة الاشتراك بناءً على نهاية الاشتراك (F-007):
 * أكثر من 7 أيام ← active، 7 أيام أو أقل ← warning،
 * انتهى (0 أو أقل) ← expired، تجاوز الانتهاء بـ 15 يومًا ← suspended
 */
export type SubscriptionStatus = "active" | "warning" | "expired" | "suspended";

export function getSubscriptionStatus(
  subEndDate: string | Date | null | undefined
): SubscriptionStatus | null {
  if (!subEndDate) return null;
  const daysLeft = Math.ceil(
    (new Date(subEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft <= -15) return "suspended";
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 7) return "warning";
  return "active";
}
