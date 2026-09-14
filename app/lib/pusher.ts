import Pusher from "pusher";

// عميل Pusher للسيرفر — يعيد null إن لم تُضبط مفاتيح البيئة
// حتى تعمل الدردشة (بدون تحديث لحظي) قبل إعداد Pusher
let pusher: Pusher | null = null;

export function getPusher(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } =
    process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    return null;
  }
  if (!pusher) {
    pusher = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusher;
}
