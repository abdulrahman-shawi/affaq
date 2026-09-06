import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { Role } from "@/types";

const roles: Role[] = ["admin", "supervisor", "teacher", "parent", "student"];

// صفحات خاصة بالأدمن وحده — لا يصل إليها المشرف
const ADMIN_ONLY_PATHS = /^\/dashboard\/admin\/(payments|supervisors)(\/|$)/;

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as Role | undefined;
    const pathname = req.nextUrl.pathname;
    const match = pathname.match(
      /^\/dashboard\/(admin|teacher|parent|student)(\/|$)/
    );

    if (match && role) {
      // المشرف يشارك الأدمن صفحاته عدا المدفوعات والمشرفين
      if (role === "supervisor") {
        if (match[1] !== "admin" || ADMIN_ONLY_PATHS.test(pathname)) {
          return NextResponse.redirect(new URL("/dashboard/admin", req.url));
        }
      } else if (roles.includes(role) && match[1] !== role) {
        // F-002 (RBAC): منع الوصول للوحة دور مختلف وإعادة التوجيه للوحة الدور الصحيح
        return NextResponse.redirect(
          new URL(`/dashboard/${role}`, req.url)
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
