import type { Prisma } from "@/generated/prisma/client";

export const chatMessageInclude = {
  sender: { select: { id: true, name: true, role: true, image: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      imageUrl: true,
      sender: { select: { name: true } },
    },
  },
  reactions: { select: { userId: true, emoji: true } },
} satisfies Prisma.ChatMessageInclude;

export type ChatMessageWithRelations = Prisma.ChatMessageGetPayload<{
  include: typeof chatMessageInclude;
}>;

export function summarizeReactions(
  reactions: { userId: string; emoji: string }[],
  viewerId: string
) {
  const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    entry.count += 1;
    if (r.userId === viewerId) entry.mine = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.values());
}

export function chatMessageToDTO(m: ChatMessageWithRelations, viewerId: string) {
  return {
    id: m.id,
    classId: m.classId,
    content: m.content,
    imageUrl: m.imageUrl,
    createdAt: m.createdAt,
    sender: m.sender,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          imageUrl: m.replyTo.imageUrl,
          senderName: m.replyTo.sender.name,
        }
      : null,
    reactions: summarizeReactions(m.reactions, viewerId),
  };
}
