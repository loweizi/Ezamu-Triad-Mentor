import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  smartGoalsTable,
  CreateSmartGoalSchema,
  UpdateSmartGoalSchema,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "./users";

const router: IRouter = Router();

router.get("/smart-goals", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const studentId = req.query.studentId
    ? parseInt(req.query.studentId as string, 10)
    : null;

  let goals;
  if (user.role === "coach") {
    const filter = studentId
      ? and(
          eq(smartGoalsTable.coachId, user.id),
          eq(smartGoalsTable.studentId, studentId),
        )
      : eq(smartGoalsTable.coachId, user.id);

    goals = await db.select().from(smartGoalsTable).where(filter);
  } else {
    goals = await db
      .select()
      .from(smartGoalsTable)
      .where(eq(smartGoalsTable.studentId, user.id));
  }

  res.json(
    goals.map((g) => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    })),
  );
});

router.post("/smart-goals", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role !== "student") {
    res.status(403).json({ error: "Only students can create SMART goals" });
    return;
  }

  const parsed = CreateSmartGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [goal] = await db
    .insert(smartGoalsTable)
    .values({
      studentId: user.id,
      coachId: parsed.data.coachId,
      title: parsed.data.title,
      specific: parsed.data.specific,
      measurable: parsed.data.measurable,
      achievable: parsed.data.achievable,
      relevant: parsed.data.relevant,
      timeBound: parsed.data.timeBound,
      status: "pending",
    })
    .returning();

  res.status(201).json({
    ...goal,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  });
});

router.patch("/smart-goals/:goalId", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role !== "coach") {
    res.status(403).json({ error: "Only coaches can update SMART goal status" });
    return;
  }

  const goalId = parseInt(req.params.goalId, 10);
  if (isNaN(goalId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateSmartGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [goal] = await db
    .select()
    .from(smartGoalsTable)
    .where(eq(smartGoalsTable.id, goalId));

  if (!goal || goal.coachId !== user.id) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  const updates: Partial<typeof smartGoalsTable.$inferInsert> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.coachFeedback !== undefined) {
    updates.coachFeedback = parsed.data.coachFeedback;
  }

  const [updated] = await db
    .update(smartGoalsTable)
    .set(updates)
    .where(eq(smartGoalsTable.id, goalId))
    .returning();

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;