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

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && <Sidebar role={role} />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          role={role}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
