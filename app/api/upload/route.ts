import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// رفع الملفات يتم مباشرة من المتصفح إلى Vercel Blob (client upload)
// لتجاوز حد 4.5MB الخاص بدوال Vercel — هذا المسار يوقّع طلبات الرفع فقط
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const sessionUser = await getSessionUser();
        if (
          !sessionUser ||
          !["admin", "teacher", "student"].includes(sessionUser.role)
        ) {
          throw new Error("غير مصرح");
        }
        return {
          allowedContentTypes: [
            "image/*",
            "video/*",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل في رفع الملف" },
      { status: 400 }
    );
  }
}
