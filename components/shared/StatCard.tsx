import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/app/lib/utils";

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  description,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName?: string;
  /** خلفية الأيقونة — مثال: "bg-blue-500/10" */
  iconBgClassName?: string;
  description?: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "shrink-0 rounded-xl bg-primary/10 p-3",
            iconBgClassName
          )}
        >
          <Icon
            className={cn("h-6 w-6 text-primary", iconClassName)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
