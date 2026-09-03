"use client";

import { usePathname } from "next/navigation";
import { Bell, LogOut, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { roleNav, roleLabels } from "./Sidebar";
import { formatDate } from "@/app/lib/utils";
import type { Role } from "@/types";

export default function Header({
  role,
  sidebarOpen,
  onToggleSidebar,
}: {
  role: Role;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markRead } = useNotifications();

  const items = roleNav[role];
  const current =
    [...items].reverse().find((item) => pathname.startsWith(item.href)) ??
    items[0];

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "إخفاء القائمة الجانبية" : "إظهار القائمة الجانبية"}
        >
          {sidebarOpen ? (
            <PanelRightClose className="h-5 w-5" />
          ) : (
            <PanelRightOpen className="h-5 w-5" />
          )}
        </Button>
        <h1 className="text-lg font-semibold">{current?.label ?? "لوحة التحكم"}</h1>
      </div>

      <div className="flex items-center gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>الإشعارات</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  لا توجد إشعارات
                </p>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-2 rounded-md border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read && <Badge variant="default">جديد</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead(n.id)}
                    >
                      تمت القراءة
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="text-left">
          <p className="text-sm font-medium">{user?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} title="تسجيل الخروج">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
