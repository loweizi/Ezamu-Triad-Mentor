import { Router, type IRouter } from "express";
import { eq, ne, and, or } from "drizzle-orm";
import { db, usersTable, peerRequestsTable } from "@workspace/db";
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
    ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, profilePicUrl: usersTable.profilePicUrl, innerHeroArchetype: usersTable.innerHeroArchetype, fieldsOfInterest: usersTable.fieldsOfInterest, bio: usersTable.bio }).from(usersTable).where(or(...userIds.map(id => eq(usersTable.id, id))))
    : [];

  const usersById = Object.fromEntries(users.map(u => [u.id, u]));

  res.json(requests.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    fromUser: usersById[r.fromUserId] ?? null,
    toUser: usersById[r.toUserId] ?? null,
    direction: r.fromUserId === me.id ? "sent" : "received",
  })));
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

export default router;
