import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetCoachesQueryParams,
  GetCoachesResponseItem,
  GetCoachParams,
  GetCoachResponse,
  GetCoachStudentsParams,
  GetCoachStudentsResponseItem,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/coaches", async (req, res): Promise<void> => {
  const parsed = GetCoachesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db.select().from(usersTable).where(eq(usersTable.role, "coach")).$dynamic();

  if (parsed.data.search) {
    const s = `%${parsed.data.search}%`;
    query = query.where(
      sql`(${usersTable.firstName} ILIKE ${s} OR ${usersTable.lastName} ILIKE ${s} OR ${usersTable.bio} ILIKE ${s})`
    );
  }

  const coaches = await query;

  const coachesWithCount = await Promise.all(coaches.map(async (coach) => {
    const students = await db.select().from(usersTable).where(eq(usersTable.coachId, coach.id));
    return {
      ...coach,
      studentCount: students.length,
      createdAt: coach.createdAt.toISOString(),
    };
  }));

  res.json(coachesWithCount.map(c => GetCoachesResponseItem.parse(c)));
});

router.get("/coaches/:coachId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.coachId) ? req.params.coachId[0] : req.params.coachId;
  const coachId = parseInt(rawId, 10);
  if (isNaN(coachId)) {
    res.status(400).json({ error: "Invalid coach ID" });
    return;
  }

  const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, coachId));
  if (!coach || coach.role !== "coach") {
    res.status(404).json({ error: "Coach not found" });
    return;
  }

  const students = await db.select().from(usersTable).where(eq(usersTable.coachId, coachId));

  res.json(GetCoachResponse.parse({
    ...coach,
    studentCount: students.length,
    createdAt: coach.createdAt.toISOString(),
  }));
});

router.get("/coaches/:coachId/students", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.coachId) ? req.params.coachId[0] : req.params.coachId;
  const coachId = parseInt(rawId, 10);
  if (isNaN(coachId)) {
    res.status(400).json({ error: "Invalid coach ID" });
    return;
  }

  const students = await db.select().from(usersTable).where(eq(usersTable.coachId, coachId));
  res.json(students.map(s => GetCoachStudentsResponseItem.parse({
    ...s,
    createdAt: s.createdAt.toISOString(),
  })));
});

export default router;
