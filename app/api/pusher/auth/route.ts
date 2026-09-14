import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { getPusher } from "@/app/lib/pusher";
import { canAccessClassChat } from "@/app/lib/chatAccess";

export const dynamic = "force-dynamic";

// تفويض القنوات الخاصة للدردشة: private-chat-class-{classId}
export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: "Pusher غير مهيأ" }, { status: 503 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");
  if (!socketId || !channelName) {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const match = channelName.match(/^private-chat-class-(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "قناة غير معروفة" }, { status: 403 });
  }

  const allowed = await canAccessClassChat(
    sessionUser.id,
    sessionUser.role,
    match[1]
  );
  if (!allowed) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const auth = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(auth);
}
