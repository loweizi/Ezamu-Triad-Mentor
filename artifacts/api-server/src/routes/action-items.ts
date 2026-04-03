import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, actionItemsTable, usersTable, smartGoalsTable } from "@workspace/db";
import {
  GetActionItemsResponseItem,
  CreateActionItemBody,
  UpdateActionItemParams,
  UpdateActionItemBody,
  UpdateActionItemResponse,
  DeleteActionItemParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function enrichItems(items: (typeof actionItemsTable.$inferSelect)[]) {
  const goalIds = [...new Set(items.map(i => i.smartGoalId).filter(Boolean))] as number[];
  const goalsMap: Record<number, string> = {};
  if (goalIds.length > 0) {
    const goals = await db.select({ id: smartGoalsTable.id, title: smartGoalsTable.title })
      .from(smartGoalsTable)
      .where(eq(smartGoalsTable.id, goalIds[0]));
    for (const g of goals) goalsMap[g.id] = g.title;

    if (goalIds.length > 1) {
      for (let i = 1; i < goalIds.length; i++) {
        const extra = await db.select({ id: smartGoalsTable.id, title: smartGoalsTable.title })
          .from(smartGoalsTable)
          .where(eq(smartGoalsTable.id, goalIds[i]));
        for (const g of extra) goalsMap[g.id] = g.title;
      }
    }
  }
  return items.map(i => GetActionItemsResponseItem.parse({
    ...i,
    createdAt: i.createdAt.toISOString(),
    smartGoalTitle: i.smartGoalId ? (goalsMap[i.smartGoalId] ?? null) : null,
  }));
}

router.get("/action-items", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const items = user.role === "student"
    ? await db.select().from(actionItemsTable).where(eq(actionItemsTable.studentId, user.id))
    : await db.select().from(actionItemsTable);

  res.json(await enrichItems(items));
});

router.post("/action-items", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const parsed = CreateActionItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db.insert(actionItemsTable).values({
    studentId: parsed.data.studentId,
    coachId: user.role === "coach" ? user.id : null,
    smartGoalId: parsed.data.smartGoalId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    completed: false,
  }).returning();

  const [enriched] = await enrichItems([item]);
  res.status(201).json(enriched);
});

router.patch("/action-items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = UpdateActionItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(actionItemsTable).set(parsed.data).where(eq(actionItemsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const [enriched] = await enrichItems([updated]);
  res.json(enriched);
});

router.delete("/action-items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(actionItemsTable).where(eq(actionItemsTable.id, id));
  res.sendStatus(204);
});

export default router;
