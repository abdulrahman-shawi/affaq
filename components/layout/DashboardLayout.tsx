"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import type { Role } from "@/types";

export default function DashboardLayout({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // نفس الزر في الهيدر: على سطح المكتب يبدّل السايدبار الثابت، وعلى الجوال يفتح/يغلق الدرج
  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen((o) => !o);
    } else {
      setMobileOpen((o) => !o);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div className="hidden h-full lg:block print:hidden">
          <Sidebar role={role} />
        </div>
      )}

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden print:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 lg:hidden print:hidden">
            <Sidebar role={role} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          role={role}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
