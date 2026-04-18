import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import {
  actionItemsTable,
  appointmentsTable,
  assessmentResultsTable,
  coachAvailabilityTable,
  coachNotesTable,
  db,
  messagesTable,
  notificationsTable,
  peerRequestsTable,
  smartGoalsTable,
  usersTable,
} from "@workspace/db";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
  OnboardUserBody,
  OnboardUserResponse,
  SearchUsersQueryParams,
  SearchUsersResponseItem,
} from "@workspace/api-zod";
import { clerkClient } from "@clerk/express";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function fetchClerkUser(
  clerkId: string,
): Promise<{ email: string; firstName: string; lastName: string } | null> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses?.[0]?.emailAddress ??
      "";
    const firstName = clerkUser.firstName ?? "";
    const lastName = clerkUser.lastName ?? "";

    return { email, firstName, lastName };
  } catch {
    return null;
  }
}

export async function getOrCreateUser(
  clerkId: string,
): Promise<typeof usersTable.$inferSelect | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (user) {
    return user;
  }

  const clerkData = await fetchClerkUser(clerkId);

  if (!clerkData || !clerkData.email) {
    return null;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId,
      email: clerkData.email,
      firstName: clerkData.firstName,
      lastName: clerkData.lastName,
      role: "student",
      fieldsOfInterest: [],
      fieldsOfExpertise: [],
      onboardingCompleted: false,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const [existingByEmail] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, clerkData.email));

  if (existingByEmail) {
    const [linked] = await db
      .update(usersTable)
      .set({
        clerkId,
        firstName: clerkData.firstName || existingByEmail.firstName,
        lastName: clerkData.lastName || existingByEmail.lastName,
        email: clerkData.email,
      })
      .where(eq(usersTable.id, existingByEmail.id))
      .returning();

    if (linked) {
      return linked;
    }
  }

  const [refetch] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  return refetch ?? null;
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    GetMeResponse.parse({
      ...user,
      createdAt: user.createdAt.toISOString(),
    }),
  );
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(
    UpdateMeResponse.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.post("/users/onboard", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const parsed = OnboardUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {
    bio: parsed.data.bio,
    onboardingCompleted: true,
  };

  if (parsed.data.firstName) updates.firstName = parsed.data.firstName;
  if (parsed.data.lastName) updates.lastName = parsed.data.lastName;
  if (parsed.data.age != null) updates.age = parsed.data.age;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.fieldsOfInterest) {
    updates.fieldsOfInterest = parsed.data.fieldsOfInterest;
  }
  if (parsed.data.fieldsOfExpertise) {
    updates.fieldsOfExpertise = parsed.data.fieldsOfExpertise;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(
    OnboardUserResponse.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.delete("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(peerRequestsTable)
      .where(eq(peerRequestsTable.fromUserId, user.id));
    await tx
      .delete(peerRequestsTable)
      .where(eq(peerRequestsTable.toUserId, user.id));

    await tx.delete(messagesTable).where(eq(messagesTable.senderId, user.id));
    await tx.delete(messagesTable).where(eq(messagesTable.receiverId, user.id));

    await tx
      .delete(notificationsTable)
      .where(eq(notificationsTable.userId, user.id));

    await tx
      .delete(actionItemsTable)
      .where(eq(actionItemsTable.studentId, user.id));
    await tx
      .delete(actionItemsTable)
      .where(eq(actionItemsTable.coachId, user.id));

    await tx
      .delete(appointmentsTable)
      .where(eq(appointmentsTable.studentId, user.id));
    await tx
      .delete(appointmentsTable)
      .where(eq(appointmentsTable.coachId, user.id));
    await tx
      .delete(appointmentsTable)
      .where(eq(appointmentsTable.peerId, user.id));

    await tx
      .delete(smartGoalsTable)
      .where(eq(smartGoalsTable.studentId, user.id));
    await tx
      .delete(smartGoalsTable)
      .where(eq(smartGoalsTable.coachId, user.id));

    await tx
      .delete(coachNotesTable)
      .where(eq(coachNotesTable.studentId, user.id));
    await tx
      .delete(coachNotesTable)
      .where(eq(coachNotesTable.coachId, user.id));

    await tx
      .delete(coachAvailabilityTable)
      .where(eq(coachAvailabilityTable.coachId, user.id));

    await tx
      .delete(assessmentResultsTable)
      .where(eq(assessmentResultsTable.studentId, user.id));

    await tx
      .update(usersTable)
      .set({ coachId: null, peerId: null })
      .where(
        or(eq(usersTable.coachId, user.id), eq(usersTable.peerId, user.id)),
      );

    await tx.delete(usersTable).where(eq(usersTable.id, user.id));
  });

  try {
    await clerkClient.users.deleteUser(clerkId);
  } catch (error) {
    res.status(500).json({
      error:
        "Database user was deleted, but Clerk account deletion failed. Please delete the auth account manually in Clerk.",
    });
    return;
  }

  res.status(204).send();
});

router.get("/users/search", requireAuth, async (req, res): Promise<void> => {
  const parsed = SearchUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(ilike(usersTable.email, `%${parsed.data.email}%`))
    .limit(10);

  res.json(users.map((u) => SearchUsersResponseItem.parse(u)));
});

export default router;