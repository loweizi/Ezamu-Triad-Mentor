import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, coachAvailabilityTable, usersTable } from "@workspace/db";
import {
  GetCoachAvailabilityQueryParams,
  GetCoachAvailabilityResponseItem,
  AddAvailabilityBody,
  DeleteAvailabilityParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/availability", async (req, res): Promise<void> => {
  const parsed = GetCoachAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slots = await db.select().from(coachAvailabilityTable)
    .where(eq(coachAvailabilityTable.coachId, parsed.data.coachId));
  res.json(slots.map(s => GetCoachAvailabilityResponseItem.parse(s)));
});

router.post("/availability", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user || user.role !== "coach") {
    res.status(403).json({ error: "Only coaches can add availability" });
    return;
  }
  const parsed = AddAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [slot] = await db.insert(coachAvailabilityTable).values({
    coachId: user.id,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  }).returning();
  res.status(201).json(GetCoachAvailabilityResponseItem.parse(slot));
});

router.delete("/availability/:slotId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(coachAvailabilityTable).where(eq(coachAvailabilityTable.id, id));
  res.sendStatus(204);
});

export default router;
