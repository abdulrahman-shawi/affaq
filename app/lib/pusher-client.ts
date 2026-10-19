"use client";

import PusherClient from "pusher-js";

// عميل Pusher للمتصفح — يعيد null إن لم تُضبط متغيرات NEXT_PUBLIC
let client: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  if (!client) {
    client = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return client;
}
