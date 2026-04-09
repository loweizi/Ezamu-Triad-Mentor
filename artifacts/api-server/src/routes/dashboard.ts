import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import {
  db,
  usersTable,
  appointmentsTable,
  actionItemsTable,
  messagesTable,
  notificationsTable,
  assessmentResultsTable,
} from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

async function getUserByClerkId(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user ?? null;
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  try {
    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await getUserByClerkId(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Let onboarding flow proceed without crashing dashboard calls.
    if (!user.onboardingCompleted) {
      res.json(
        GetDashboardSummaryResponse.parse({
          upcomingAppointmentsCount: 0,
          pendingActionItemsCount: 0,
          completedActionItemsCount: 0,
          unreadMessagesCount: 0,
          unreadNotificationsCount: 0,
          latestAssessmentType: null,
          assignedStudentsCount: user.role === "coach" ? 0 : null,
        })
      );
      return;
    }

    const now = new Date();

    const upcomingAppts =
      user.role === "student"
        ? await db
            .select()
            .from(appointmentsTable)
            .where(
              and(
                eq(appointmentsTable.studentId, user.id),
                gte(appointmentsTable.scheduledAt, now)
              )
            )
        : await db
            .select()
            .from(appointmentsTable)
            .where(
              and(
                eq(appointmentsTable.coachId, user.id),
                gte(appointmentsTable.scheduledAt, now)
              )
            );

    const allActionItems = await db
      .select()
      .from(actionItemsTable)
      .where(eq(actionItemsTable.studentId, user.id));

    const pendingCount = allActionItems.filter((i) => !i.completed).length;
    const completedCount = allActionItems.filter((i) => i.completed).length;

    const unreadMessages = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.receiverId, user.id), eq(messagesTable.read, false)));

    const unreadNotifs = await db
      .select()
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.read, false)));

    const [latestAssessment] = await db
      .select()
      .from(assessmentResultsTable)
      .where(eq(assessmentResultsTable.studentId, user.id))
      .orderBy(desc(assessmentResultsTable.dateTaken))
      .limit(1);

    let assignedStudentsCount: number | null = null;
    if (user.role === "coach") {
      const students = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.coachId, user.id));
      assignedStudentsCount = students.length;
    }

    res.json(
      GetDashboardSummaryResponse.parse({
        upcomingAppointmentsCount: upcomingAppts.length,
        pendingActionItemsCount: pendingCount,
        completedActionItemsCount: completedCount,
        unreadMessagesCount: unreadMessages.length,
        unreadNotificationsCount: unreadNotifs.length,
        latestAssessmentType: latestAssessment?.innerHeroType ?? null,
        assignedStudentsCount,
      })
    );
  } catch (error) {
    console.error("GET /dashboard/summary failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;