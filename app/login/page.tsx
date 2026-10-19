"use client";

import { useEffect, useState } from "react";
import { signIn, getSession, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { roleDashboardPath } from "@/app/lib/roles";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { academyName, logoUrl } = useSiteSettings();

  // رسالة عند طرد الطالب من الجلسة بسبب إيقاف حسابه أو انتهاء اشتراكه
  useEffect(() => {
    const blocked = new URLSearchParams(window.location.search).get("blocked");
    if (blocked === "suspended") {
      setError("تم إيقاف حسابك من قبل الإدارة. تم تسجيل خروجك تلقائيًا.");
    } else if (blocked === "expired") {
      setError("انتهى اشتراكك في الأكاديمية. تم تسجيل خروجك تلقائيًا.");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      router.replace(roleDashboardPath(session.user.role));
    }
  }, [router, session, status]);

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated") {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      identifier,
      password,
    });

    if (result?.error) {
      if (result.error === "ACCOUNT_SUSPENDED") {
        setError("تم إيقاف حسابك من قبل الإدارة. تواصل معنا لتفعيله.");
      } else if (result.error === "SUBSCRIPTION_EXPIRED") {
        setError("انتهى اشتراكك. يرجى تجديد الاشتراك للدخول.");
      } else {
        setError("الاسم أو البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }
      setLoading(false);
      return;
    }

    const session = await getSession();
    router.push(roleDashboardPath(session?.user?.role));
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={academyName}
              className="mb-2 h-14 w-14 rounded object-contain"
            />
          ) : (
            <GraduationCap className="mb-2 h-10 w-10 text-primary" />
          )}
          <CardTitle className="text-2xl">{academyName}</CardTitle>
          <CardDescription>سجّل الدخول للوصول إلى لوحة التحكم</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">الاسم أو البريد الإلكتروني</Label>
              <Input
                id="identifier"
                type="text"
                required
                dir="ltr"
                placeholder="الاسم أو name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
