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
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "./users";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
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
              gte(appointmentsTable.scheduledAt, now),
            ),
          )
      : await db
          .select()
          .from(appointmentsTable)
          .where(
            and(
              eq(appointmentsTable.coachId, user.id),
              gte(appointmentsTable.scheduledAt, now),
            ),
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
    .where(
      and(
        eq(messagesTable.receiverId, user.id),
        eq(messagesTable.read, false),
      ),
    );

  const unreadNotifs = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, user.id),
        eq(notificationsTable.read, false),
      ),
    );

  const [latestAssessment] = await db
    .select()
    .from(assessmentResultsTable)
    .where(eq(assessmentResultsTable.studentId, user.id))
    .orderBy(desc(assessmentResultsTable.dateTaken))
    .limit(1);

  let assignedStudentsCount = null;
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
    }),
  );
});

export default router;