import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, actionItemsTable, usersTable } from "@workspace/db";
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

  res.json(items.map(i => GetActionItemsResponseItem.parse({
    ...i,
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/action-items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateActionItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(actionItemsTable).values({
    studentId: parsed.data.studentId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    completed: false,
  }).returning();
  res.status(201).json(GetActionItemsResponseItem.parse({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));
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
  res.json(UpdateActionItemResponse.parse({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  }));
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
