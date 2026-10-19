import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "لا توجد بيانات",
  message,
  action,
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground/50" />
      <p className="font-medium text-muted-foreground">{title}</p>
      {message && <p className="text-sm text-muted-foreground/70">{message}</p>}
      {action}
    </div>
  );
}
