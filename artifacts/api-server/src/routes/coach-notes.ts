import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, coachNotesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/coach-notes/:studentId", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [coach] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!coach) { res.status(404).json({ error: "User not found" }); return; }
  if (coach.role !== "coach") { res.status(403).json({ error: "Only coaches can access coach notes" }); return; }

  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student ID" }); return; }

  const [note] = await db.select().from(coachNotesTable).where(
    and(eq(coachNotesTable.coachId, coach.id), eq(coachNotesTable.studentId, studentId))
  );

  res.json(note ? { ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() } : { content: "" });
});

router.put("/coach-notes/:studentId", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [coach] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!coach) { res.status(404).json({ error: "User not found" }); return; }
  if (coach.role !== "coach") { res.status(403).json({ error: "Only coaches can write coach notes" }); return; }

  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student ID" }); return; }

  const { content } = req.body;
  if (typeof content !== "string") { res.status(400).json({ error: "content must be a string" }); return; }

  const [existing] = await db.select().from(coachNotesTable).where(
    and(eq(coachNotesTable.coachId, coach.id), eq(coachNotesTable.studentId, studentId))
  );

  let note;
  if (existing) {
    [note] = await db.update(coachNotesTable).set({ content }).where(eq(coachNotesTable.id, existing.id)).returning();
  } else {
    [note] = await db.insert(coachNotesTable).values({ coachId: coach.id, studentId, content }).returning();
  }

  res.json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() });
});

export default router;
