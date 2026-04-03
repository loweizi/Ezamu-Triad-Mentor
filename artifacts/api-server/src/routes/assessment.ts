import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, assessmentResultsTable, usersTable } from "@workspace/db";
import {
  GetAssessmentResultsResponseItem,
  SaveAssessmentResultBody,
  GetLatestAssessmentResultResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/assessment/results", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const results = await db.select().from(assessmentResultsTable)
    .where(eq(assessmentResultsTable.studentId, user.id))
    .orderBy(desc(assessmentResultsTable.dateTaken));
  res.json(results.map(r => GetAssessmentResultsResponseItem.parse({
    ...r,
    dateTaken: r.dateTaken.toISOString(),
  })));
});

router.post("/assessment/results", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = SaveAssessmentResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [result] = await db.insert(assessmentResultsTable).values({
    studentId: user.id,
    innerHeroType: parsed.data.innerHeroType,
    helperScore: parsed.data.helperScore,
    doerScore: parsed.data.doerScore,
    thinkerScore: parsed.data.thinkerScore,
    plannerScore: parsed.data.plannerScore,
    summary: parsed.data.summary,
  }).returning();

  // Update user's inner hero archetype
  await db.update(usersTable).set({ innerHeroArchetype: parsed.data.innerHeroType }).where(eq(usersTable.id, user.id));

  res.status(201).json(GetAssessmentResultsResponseItem.parse({
    ...result,
    dateTaken: result.dateTaken.toISOString(),
  }));
});

router.get("/assessment/results/latest", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [result] = await db.select().from(assessmentResultsTable)
    .where(eq(assessmentResultsTable.studentId, user.id))
    .orderBy(desc(assessmentResultsTable.dateTaken))
    .limit(1);
  if (!result) {
    res.status(404).json({ error: "No assessment taken yet" });
    return;
  }
  res.json(GetLatestAssessmentResultResponse.parse({
    ...result,
    dateTaken: result.dateTaken.toISOString(),
  }));
});

export default router;
