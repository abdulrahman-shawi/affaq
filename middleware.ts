import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { Role } from "@/types";

const roles: Role[] = ["admin", "teacher", "parent", "student"];

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as Role | undefined;
    const match = req.nextUrl.pathname.match(
      /^\/dashboard\/(admin|teacher|parent|student)(\/|$)/
    );

    // F-002 (RBAC): منع الوصول للوحة دور مختلف وإعادة التوجيه للوحة الدور الصحيح
    if (match && role && roles.includes(role) && match[1] !== role) {
      return NextResponse.redirect(
        new URL(`/dashboard/${role}`, req.url)
      );
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
