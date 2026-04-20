import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  usersTable,
  assessmentResultsTable,
  smartGoalsTable,
  actionItemsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "./users";

const router: IRouter = Router();

/**
 * GET /api/guardian/student?studentId=<id>
 * Read-only view of a guardian's linked student profile.
 * Backend enforces guardian ownership.
 */
router.get("/guardian/student", requireAuth, async (req, res): Promise<void> => {
  try {
    const clerkId = (req as any).clerkUserId as string;

    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const studentId = parseInt(req.query.studentId as string, 10);
    if (isNaN(studentId)) {
      res.status(400).json({ error: "studentId is required" });
      return;
    }

    const currentUser = await getOrCreateUser(clerkId);

    if (!currentUser) {
      res.status(404).json({ error: "Authenticated user not found" });
      return;
    }

    if (currentUser.role !== "guardian") {
      res.status(403).json({ error: "Only guardians can access this route" });
      return;
    }

    const [student] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, studentId),
          eq(usersTable.role, "student"),
          eq(usersTable.guardianId, currentUser.id),
        ),
      );

    if (!student) {
      res.status(404).json({ error: "Student not found or not linked to this guardian" });
      return;
    }

    const [coach] = student.coachId
      ? await db.select().from(usersTable).where(eq(usersTable.id, student.coachId))
      : [null];

    const [peer] = student.peerId
      ? await db.select().from(usersTable).where(eq(usersTable.id, student.peerId))
      : [null];

    const [guardian] = student.guardianId
      ? await db.select().from(usersTable).where(eq(usersTable.id, student.guardianId))
      : [null];

    const [assessment] = await db
      .select()
      .from(assessmentResultsTable)
      .where(eq(assessmentResultsTable.studentId, studentId))
      .orderBy(desc(assessmentResultsTable.dateTaken))
      .limit(1);

    const smartGoals = await db
      .select()
      .from(smartGoalsTable)
      .where(eq(smartGoalsTable.studentId, studentId));

    const actionItems = await db
      .select()
      .from(actionItemsTable)
      .where(eq(actionItemsTable.studentId, studentId));

    res.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        profilePicUrl: student.profilePicUrl ?? null,
        innerHeroArchetype: student.innerHeroArchetype ?? null,
        fieldsOfInterest: student.fieldsOfInterest,
        bio: student.bio ?? null,
        age: student.age ?? null,
      },
      assessment: assessment
        ? {
            innerHeroType: assessment.innerHeroType,
            helperScore: assessment.helperScore,
            doerScore: assessment.doerScore,
            thinkerScore: assessment.thinkerScore,
            plannerScore: assessment.plannerScore,
            summary: assessment.summary,
            dateTaken: assessment.dateTaken.toISOString(),
          }
        : null,
      smartGoals: smartGoals.map((g) => ({
        ...g,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
      actionItems: actionItems.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
      triad: {
        studentName: `${student.firstName} ${student.lastName}`,
        coachName: coach
          ? `${coach.firstName} ${coach.lastName}`
          : "No coach is connected",
        peerName: peer
          ? `${peer.firstName} ${peer.lastName}`
          : "No peer is connected",
        guardianName: guardian
          ? `${guardian.firstName} ${guardian.lastName}`
          : "No guardian is connected",
      },
    });
  } catch (error) {
    console.error("Error fetching guardian student view:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;