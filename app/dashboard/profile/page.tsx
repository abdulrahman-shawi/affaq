"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { Trash2, Upload, User } from "lucide-react";
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

export default function ProfilePage() {
  const { toast } = useToast();
  const { update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) throw new Error("فشل في جلب البيانات");
        return res.json();
      })
      .then((user) => {
        setName(user.name ?? "");
        setEmail(user.email ?? "");
        setImageUrl(user.image ?? null);
        setPreview(user.image ?? null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
      )
      .finally(() => setLoading(false));
  }, []);

  function handlePickImage(file: File | undefined) {
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImageUrl(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }

    setSaving(true);
    try {
      // رفع الصورة الجديدة (إن وُجدت) مباشرة إلى Vercel Blob
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const blob = await upload(imageFile.name, imageFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        finalImageUrl = blob.url;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          image: finalImageUrl,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "فشل في حفظ البيانات");
      }

      // تحديث الجلسة حتى تنعكس البيانات الجديدة في الواجهة فورًا
      await update({ name, email, image: finalImageUrl });

      setImageFile(null);
      setImageUrl(finalImageUrl);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ variant: "success", title: "تم حفظ البيانات بنجاح" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl text-center text-muted-foreground">
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>الملف الشخصي</CardTitle>
          <CardDescription>
            تعديل الصورة الشخصية والاسم والبريد الإلكتروني
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>الصورة الشخصية</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted/40">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="الصورة الشخصية"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePickImage(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {preview ? "تغيير الصورة" : "رفع صورة"}
                  </Button>
                  {preview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="h-4 w-4" />
                      إزالة الصورة
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-name">الاسم</Label>
              <Input
                id="profile-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">البريد الإلكتروني</Label>
              <Input
                id="profile-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium">تغيير كلمة المرور</p>
              <p className="text-xs text-muted-foreground">
                اترك الحقول التالية فارغة إذا كنت لا تريد تغيير كلمة المرور
              </p>
              <div className="space-y-2">
                <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                <Input
                  id="current-password"
                  type="password"
                  dir="ltr"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                <Input
                  id="new-password"
                  type="password"
                  dir="ltr"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  تأكيد كلمة المرور الجديدة
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  dir="ltr"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
