"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { GraduationCap, Trash2, Upload } from "lucide-react";
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
import { useToast } from "@/components/ui/toaster";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const settings = useSiteSettings();
  const [siteName, setSiteName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSiteName(settings.siteName);
    setAcademyName(settings.academyName);
    setLogoUrl(settings.logoUrl);
    setPreview(settings.logoUrl);
  }, [settings.siteName, settings.academyName, settings.logoUrl]);

  function handlePickLogo(file: File | undefined) {
    if (!file) return;
    setLogoFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoUrl(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // رفع اللوغو الجديد (إن وُجد) مباشرة إلى Vercel Blob
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const blob = await upload(logoFile.name, logoFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        finalLogoUrl = blob.url;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          academyName,
          logoUrl: finalLogoUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ الإعدادات");
      }
      setLogoFile(null);
      settings.refresh();
      toast({ variant: "success", title: "تم حفظ الإعدادات بنجاح" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الموقع</CardTitle>
          <CardDescription>
            التحكم في اسم الموقع واسم الأكاديمية واللوغو الظاهر في الواجهة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="site-name">اسم الموقع (عنوان المتصفح)</Label>
              <Input
                id="site-name"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="academy-name">
                اسم الأكاديمية (يظهر في القائمة الجانبية)
              </Label>
              <Input
                id="academy-name"
                required
                value={academyName}
                onChange={(e) => setAcademyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>اللوغو</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted/40">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="اللوغو"
                      className="h-16 w-16 rounded object-contain"
                    />
                  ) : (
                    <GraduationCap className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePickLogo(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {preview ? "تغيير اللوغو" : "رفع لوغو"}
                  </Button>
                  {preview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="h-4 w-4" />
                      إزالة اللوغو
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                عند عدم رفع لوغو تظهر الأيقونة الافتراضية
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
