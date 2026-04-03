import { Router, type IRouter } from "express";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { db, messagesTable, usersTable } from "@workspace/db";
import {
  GetMessagesQueryParams,
  GetMessagesResponseItem,
  SendMessageBody,
  GetConversationsResponseItem,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = GetMessagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const withUserId = parsed.data.withUserId;
  const messages = await db.select().from(messagesTable)
    .where(
      or(
        and(eq(messagesTable.senderId, user.id), eq(messagesTable.receiverId, withUserId)),
        and(eq(messagesTable.senderId, withUserId), eq(messagesTable.receiverId, user.id))
      )
    )
    .orderBy(messagesTable.createdAt);

  const enriched = await Promise.all(messages.map(async (m) => {
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, m.senderId));
    return {
      ...m,
      createdAt: m.createdAt.toISOString(),
      senderName: sender ? `${sender.firstName} ${sender.lastName}` : "Unknown",
      senderProfilePic: sender?.profilePicUrl ?? null,
    };
  }));

  res.json(enriched.map(m => GetMessagesResponseItem.parse(m)));
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [message] = await db.insert(messagesTable).values({
    senderId: user.id,
    receiverId: parsed.data.receiverId,
    content: parsed.data.content,
    read: false,
  }).returning();

  res.status(201).json(GetMessagesResponseItem.parse({
    ...message,
    createdAt: message.createdAt.toISOString(),
    senderName: `${user.firstName} ${user.lastName}`,
    senderProfilePic: user.profilePicUrl ?? null,
  }));
});

router.patch("/messages/read", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { withUserId } = req.body as { withUserId?: number };
  if (!withUserId || typeof withUserId !== "number") {
    res.status(400).json({ error: "withUserId required" });
    return;
  }
  await db.update(messagesTable)
    .set({ read: true })
    .where(
      and(
        eq(messagesTable.senderId, withUserId),
        eq(messagesTable.receiverId, user.id),
        eq(messagesTable.read, false)
      )
    );
  res.sendStatus(204);
});

router.get("/messages/conversations", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const allMessages = await db.select().from(messagesTable)
    .where(or(eq(messagesTable.senderId, user.id), eq(messagesTable.receiverId, user.id)))
    .orderBy(desc(messagesTable.createdAt));

  // Group by contact and get latest message
  const contactMap = new Map<number, typeof messagesTable.$inferSelect>();
  for (const msg of allMessages) {
    const contactId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
    if (!contactMap.has(contactId)) {
      contactMap.set(contactId, msg);
    }
  }

  const conversations = await Promise.all(Array.from(contactMap.entries()).map(async ([contactId, lastMsg]) => {
    const [contact] = await db.select().from(usersTable).where(eq(usersTable.id, contactId));
    const unreadMessages = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.senderId, contactId), eq(messagesTable.receiverId, user.id), eq(messagesTable.read, false)));
    return {
      userId: contactId,
      firstName: contact?.firstName ?? "Unknown",
      lastName: contact?.lastName ?? "",
      profilePicUrl: contact?.profilePicUrl ?? null,
      lastMessage: lastMsg.content,
      lastMessageAt: lastMsg.createdAt.toISOString(),
      unreadCount: unreadMessages.length,
    };
  }));

  res.json(conversations.map(c => GetConversationsResponseItem.parse(c)));
});

export default router;
