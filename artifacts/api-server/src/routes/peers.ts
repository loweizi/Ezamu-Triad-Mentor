import { Router, type IRouter } from "express";
import { eq, ne, and, or } from "drizzle-orm";
import { db, usersTable, peerRequestsTable, actionItemsTable, smartGoalsTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) { res.status(404).json({ error: "User not found" }); return; }
  if (me.role !== "student") { res.status(403).json({ error: "Only students can browse peers" }); return; }

  const students = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profilePicUrl: usersTable.profilePicUrl,
      innerHeroArchetype: usersTable.innerHeroArchetype,
      fieldsOfInterest: usersTable.fieldsOfInterest,
      bio: usersTable.bio,
      age: usersTable.age,
    })
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), ne(usersTable.id, me.id)));

  const requests = await db
    .select()
    .from(peerRequestsTable)
    .where(or(eq(peerRequestsTable.fromUserId, me.id), eq(peerRequestsTable.toUserId, me.id)));

  const result = students.map(s => {
    const req = requests.find(r =>
      (r.fromUserId === me.id && r.toUserId === s.id) ||
      (r.toUserId === me.id && r.fromUserId === s.id)
    );
    return {
      ...s,
      requestId: req?.id ?? null,
      requestStatus: req?.status ?? null,
      requestDirection: req
        ? req.fromUserId === me.id ? "sent" : "received"
        : null,
    };
  });

  res.json(result);
});

router.get("/peer-requests", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) { res.status(404).json({ error: "User not found" }); return; }

  const requests = await db
    .select()
    .from(peerRequestsTable)
    .where(or(eq(peerRequestsTable.fromUserId, me.id), eq(peerRequestsTable.toUserId, me.id)));

  const userIds = [...new Set(requests.flatMap(r => [r.fromUserId, r.toUserId]))];
  const users = userIds.length
    ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email, profilePicUrl: usersTable.profilePicUrl, innerHeroArchetype: usersTable.innerHeroArchetype, fieldsOfInterest: usersTable.fieldsOfInterest, bio: usersTable.bio }).from(usersTable).where(or(...userIds.map(id => eq(usersTable.id, id))))
    : [];

  const usersById = Object.fromEntries(users.map(u => [u.id, u]));

  res.json(requests.map(r => {
    const isAccepted = r.status === "accepted";
    const fromUser = usersById[r.fromUserId] ?? null;
    const toUser = usersById[r.toUserId] ?? null;
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      fromUser: fromUser ? { ...fromUser, email: isAccepted ? fromUser.email : undefined } : null,
      toUser: toUser ? { ...toUser, email: isAccepted ? toUser.email : undefined } : null,
      direction: r.fromUserId === me.id ? "sent" : "received",
    };
  }));
});

router.post("/peer-requests", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) { res.status(404).json({ error: "User not found" }); return; }
  if (me.role !== "student") { res.status(403).json({ error: "Only students can send peer requests" }); return; }

  const { toUserId } = req.body;
  if (!toUserId || typeof toUserId !== "number") { res.status(400).json({ error: "toUserId required" }); return; }

  const [existing] = await db
    .select()
    .from(peerRequestsTable)
    .where(or(
      and(eq(peerRequestsTable.fromUserId, me.id), eq(peerRequestsTable.toUserId, toUserId)),
      and(eq(peerRequestsTable.fromUserId, toUserId), eq(peerRequestsTable.toUserId, me.id))
    ));

  if (existing) { res.status(409).json({ error: "Request already exists" }); return; }

  const [created] = await db.insert(peerRequestsTable).values({ fromUserId: me.id, toUserId, status: "pending" }).returning();
  res.status(201).json({ ...created, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString() });
});

router.patch("/peer-requests/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) { res.status(404).json({ error: "User not found" }); return; }

  const requestId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!["accepted", "rejected", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }

  const [peerReq] = await db.select().from(peerRequestsTable).where(eq(peerRequestsTable.id, requestId));
  if (!peerReq) { res.status(404).json({ error: "Request not found" }); return; }
  if (peerReq.toUserId !== me.id && peerReq.fromUserId !== me.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [updated] = await db
    .update(peerRequestsTable)
    .set({ status })
    .where(eq(peerRequestsTable.id, requestId))
    .returning();

  if (status === "accepted") {
    await db.update(usersTable).set({ peerId: peerReq.fromUserId }).where(eq(usersTable.id, peerReq.toUserId));
    await db.update(usersTable).set({ peerId: peerReq.toUserId }).where(eq(usersTable.id, peerReq.fromUserId));
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.get("/peer/summary", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) { res.status(404).json({ error: "User not found" }); return; }
  if (!me.peerId) { res.status(200).json(null); return; }

  const [peer] = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    profilePicUrl: usersTable.profilePicUrl,
    innerHeroArchetype: usersTable.innerHeroArchetype,
    fieldsOfInterest: usersTable.fieldsOfInterest,
    bio: usersTable.bio,
  }).from(usersTable).where(eq(usersTable.id, me.peerId));

  if (!peer) { res.status(200).json(null); return; }

  const actionItems = await db.select().from(actionItemsTable).where(eq(actionItemsTable.studentId, me.peerId));
  const smartGoals = await db.select({
    id: smartGoalsTable.id,
    title: smartGoalsTable.title,
    status: smartGoalsTable.status,
    timeBound: smartGoalsTable.timeBound,
  }).from(smartGoalsTable).where(eq(smartGoalsTable.studentId, me.peerId));

  res.json({
    peer,
    actionItems: actionItems.map(i => ({
      id: i.id,
      title: i.title,
      description: i.description,
      completed: i.completed,
      createdAt: i.createdAt.toISOString(),
    })),
    smartGoals: smartGoals.map(g => ({
      id: g.id,
      title: g.title,
      status: g.status,
      timeBound: g.timeBound instanceof Date ? g.timeBound.toISOString() : g.timeBound,
    })),
  });
});

router.post("/peer/nudge", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) { res.status(404).json({ error: "User not found" }); return; }
  if (!me.peerId) { res.status(400).json({ error: "You don't have a peer yet" }); return; }

  const { taskTitle } = req.body;
  const senderName = `${me.firstName} ${me.lastName}`;
  const message = taskTitle
    ? `${senderName} sent you a nudge: don't forget to complete "${taskTitle}"! You've got this! 💪`
    : `${senderName} sent you a nudge to keep going and finish your tasks! You've got this! 💪`;

  const [notif] = await db.insert(notificationsTable).values({
    userId: me.peerId,
    type: "nudge",
    message,
    read: false,
  }).returning();

  res.status(201).json({ ...notif, createdAt: notif.createdAt.toISOString() });
});

export default router;
