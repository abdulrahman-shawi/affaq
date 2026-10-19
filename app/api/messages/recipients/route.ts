import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { getAllowedTargets } from "@/app/lib/messageTargets";

export const dynamic = "force-dynamic";

// يعيد الجهات المسموح للمستخدم الحالي إرسال الرسائل إليها حسب دوره
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const targets = await getAllowedTargets(sessionUser.id, sessionUser.role);
    return NextResponse.json(targets);
  } catch {
    return NextResponse.json(
      { error: "فشل في تحميل جهات الإرسال" },
      { status: 500 }
    );
  }
}
