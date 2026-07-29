"use client";

import type { ReactNode } from "react";
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
  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
