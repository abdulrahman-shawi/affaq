"use client";

import { useEffect, type ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";

// مسح بيانات الذاكرة المحلية ثم إنهاء الجلسة وإعادة التوجيه لصفحة الدخول
function purgeAndSignOut(reason: "suspended" | "expired") {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // تجاهل أخطاء التخزين
  }
  signOut({ callbackUrl: `/login?blocked=${reason}` });
}

export default function StudentStatusGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "student") return;

    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch("/api/students/me", { cache: "no-store" });
        if (!res.ok) return; // خطأ مؤقت (شبكة/جلسة) — لا نطرد الطالب
        const data: { status?: string } = await res.json();
        if (cancelled) return;
        if (data.status === "suspended") purgeAndSignOut("suspended");
        else if (data.status && data.status !== "active") purgeAndSignOut("expired");
      } catch {
        // تجاهل أخطاء الشبكة
      }
    }

    checkStatus();
    // فحص دوري أثناء الاستخدام لإيقاف الطالب فورًا عند تغيير حالته
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, session?.user?.role]);

  return <>{children}</>;
}
