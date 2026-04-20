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

async function getAllowedChatContacts(user: typeof usersTable.$inferSelect) {
  const allowedIds = new Set<number>();

  if (user.role === "student") {
    if (user.coachId) allowedIds.add(user.coachId);
    if (user.peerId) allowedIds.add(user.peerId);
    if (user.guardianId) allowedIds.add(user.guardianId);
  }

  if (user.role === "peer" && user.studentId) {
    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.studentId));

    if (student) {
      allowedIds.add(student.id);
      if (student.coachId) allowedIds.add(student.coachId);
      if (student.guardianId) allowedIds.add(student.guardianId);
    }
  }

  if (user.role === "guardian" && user.studentId) {
    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.studentId));

    if (student) {
      allowedIds.add(student.id);
      if (student.coachId) allowedIds.add(student.coachId);
      if (student.peerId) allowedIds.add(student.peerId);
    }
  }

  if (allowedIds.size === 0) {
    return [];
  }

  const contacts = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      profilePicUrl: usersTable.profilePicUrl,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(or(...Array.from(allowedIds).map((id) => eq(usersTable.id, id))));

  return contacts;
}

async function canUsersMessageEachOther(
  sender: typeof usersTable.$inferSelect,
  receiver: typeof usersTable.$inferSelect,
): Promise<boolean> {
  if (sender.id === receiver.id) {
    return false;
  }

  // Coaches can message anyone
  if (sender.role === "coach") {
    return true;
  }

  // Students can only message their own triad members
  if (sender.role === "student") {
    return (
      receiver.id === sender.coachId ||
      receiver.id === sender.peerId ||
      receiver.id === sender.guardianId
    );
  }

  // Peers can only message within their triad
  if (sender.role === "peer") {
    if (!sender.studentId) return false;

    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, sender.studentId));

    if (!student) return false;

    return (
      receiver.id === student.id ||
      receiver.id === student.coachId ||
      receiver.id === student.guardianId
    );
  }

  // Guardians can only message within their triad
  if (sender.role === "guardian") {
    if (!sender.studentId) return false;

    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, sender.studentId));

    if (!student) return false;

    return (
      receiver.id === student.id ||
      receiver.id === student.coachId ||
      receiver.id === student.peerId
    );
  }

  return false;
}

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
  const [otherUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, withUserId));

  if (!otherUser) {
    res.status(404).json({ error: "Conversation user not found" });
    return;
  }

  const allowed = await canUsersMessageEachOther(user, otherUser);

  if (!allowed) {
    res.status(403).json({ error: "You can only message users in your triad" });
    return;
  }
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
  const [receiver] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.receiverId));

  if (!receiver) {
    res.status(404).json({ error: "Receiver not found" });
    return;
  }

  const allowed = await canUsersMessageEachOther(user, receiver);

  if (!allowed) {
    res.status(403).json({ error: "You can only message users in your triad" });
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
    if (!contact) return null;

    const allowed = await canUsersMessageEachOther(user, contact);
    if (!allowed) return null;

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

router.get("/messages/allowed-contacts", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === "coach") {
    res.json([]);
    return;
  }

  const contacts = await getAllowedChatContacts(user);
  res.json(contacts);
});

export default router;
