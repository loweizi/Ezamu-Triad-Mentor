import { Router, type IRouter } from "express";
import { eq, ilike, or, isNotNull, and } from "drizzle-orm";
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

    if (user.role === "coach") {
      await tx
        .delete(actionItemsTable)
        .where(eq(actionItemsTable.coachId, user.id));

      await tx
        .delete(smartGoalsTable)
        .where(eq(smartGoalsTable.coachId, user.id));

      await tx
        .delete(coachNotesTable)
        .where(eq(coachNotesTable.coachId, user.id));

      await tx
        .delete(coachAvailabilityTable)
        .where(eq(coachAvailabilityTable.coachId, user.id));

      await tx
        .delete(appointmentsTable)
        .where(eq(appointmentsTable.coachId, user.id));

      // Break triads: students lose coach + peer, peers go idle
      await tx
        .update(usersTable)
        .set({ coachId: null, peerId: null })
        .where(
          and(
            eq(usersTable.coachId, user.id),
            eq(usersTable.role, "student"),
          ),
        );

      await tx
        .update(usersTable)
        .set({ coachId: null })
        .where(
          and(
            eq(usersTable.coachId, user.id),
            eq(usersTable.role, "peer"),
          ),
        );
    }

    if (user.role === "student") {
      await tx
        .delete(actionItemsTable)
        .where(eq(actionItemsTable.studentId, user.id));

      await tx
        .delete(smartGoalsTable)
        .where(eq(smartGoalsTable.studentId, user.id));

      await tx
        .delete(coachNotesTable)
        .where(eq(coachNotesTable.studentId, user.id));

      await tx
        .delete(assessmentResultsTable)
        .where(eq(assessmentResultsTable.studentId, user.id));

      await tx
        .delete(appointmentsTable)
        .where(eq(appointmentsTable.studentId, user.id));

      // If this student had a peer, release that peer back to idle
      if (user.peerId) {
        await tx
          .update(usersTable)
          .set({ coachId: null })
          .where(eq(usersTable.id, user.peerId));
      }
    }

    if (user.role === "peer") {
      // Student keeps coach, loses peer
      await tx
        .update(usersTable)
        .set({ peerId: null })
        .where(eq(usersTable.peerId, user.id));

      // Existing coach-student appointments should remain, just remove peer from them
      await tx
        .update(appointmentsTable)
        .set({ peerId: null })
        .where(eq(appointmentsTable.peerId, user.id));
    }

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

router.post("/users/assign-peer", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const coach = await getOrCreateUser(clerkId);

  if (!coach || coach.role !== "coach") {
    res.status(403).json({ error: "Only coaches can assign peers" });
    return;
  }

  const { studentId, peerId } = req.body ?? {};

  if (typeof studentId !== "number" || typeof peerId !== "number") {
    res.status(400).json({ error: "studentId and peerId must be numbers" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, studentId));

  const [peer] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, peerId));

  if (!student || student.role !== "student") {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (!peer || peer.role !== "peer") {
    res.status(404).json({ error: "Peer not found" });
    return;
  }

  // Block only if the student is already assigned to a different coach
  if (student.coachId && student.coachId !== coach.id) {
    res.status(403).json({ error: "This student belongs to another coach" });
    return;
  }

  await db.transaction(async (tx) => {
    // Remove this peer from any other student first
    await tx
      .update(usersTable)
      .set({ peerId: null })
      .where(eq(usersTable.peerId, peer.id));

    // Claim student under this coach and assign peer
    await tx
      .update(usersTable)
      .set({
        coachId: coach.id,
        peerId: peer.id,
      })
      .where(eq(usersTable.id, student.id));

    // Mark peer as belonging under this coach
    await tx
      .update(usersTable)
      .set({ coachId: coach.id })
      .where(eq(usersTable.id, peer.id));
  });

  res.json({ message: "Peer assigned successfully" });
});

router.post("/users/remove-peer", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const coach = await getOrCreateUser(clerkId);

  if (!coach || coach.role !== "coach") {
    res.status(403).json({ error: "Only coaches can remove peers" });
    return;
  }

  const { studentId } = req.body ?? {};

  if (typeof studentId !== "number") {
    res.status(400).json({ error: "studentId must be a number" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, studentId));

  if (!student || student.role !== "student") {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (student.coachId !== coach.id) {
    res.status(403).json({ error: "You are not assigned to this student" });
    return;
  }

  if (!student.peerId) {
    res.status(400).json({ error: "This student does not have a peer assigned" });
    return;
  }

  const peerId = student.peerId;

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ peerId: null })
      .where(eq(usersTable.id, student.id));

    await tx
      .update(usersTable)
      .set({ coachId: null })
      .where(eq(usersTable.id, peerId));

    await tx
      .update(appointmentsTable)
      .set({ peerId: null })
      .where(
        and(
          eq(appointmentsTable.studentId, student.id),
          eq(appointmentsTable.peerId, peerId),
        ),
      );
  });

  res.json({ message: "Peer removed successfully" });
});

router.get("/users/available-peers", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const coach = await getOrCreateUser(clerkId);

  if (!coach || coach.role !== "coach") {
    res.status(403).json({ error: "Only coaches can view peers" });
    return;
  }

  // Get all peers who are:
  // - role = peer
  // - finished onboarding
  // - NOT currently assigned to any student
  const peers = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "peer"));

  // Filter out assigned peers
  const assignedPeerIds = await db
    .select({ peerId: usersTable.peerId })
    .from(usersTable)
    .where(isNotNull(usersTable.peerId));

  const assignedSet = new Set(
    assignedPeerIds.map((p) => p.peerId).filter(Boolean)
  );

  const availablePeers = peers.filter(
    (p) =>
      p.onboardingCompleted &&
      !assignedSet.has(p.id)
  );

  res.json(
    availablePeers.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      profilePicUrl: p.profilePicUrl ?? null,
      bio: p.bio ?? "",
      age: p.age ?? null,
      fieldsOfInterest: p.fieldsOfInterest ?? [],
      fieldsOfExpertise: p.fieldsOfExpertise ?? [],
    }))
  );
});

router.get("/users/peer-dashboard", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const peer = await getOrCreateUser(clerkId);

  if (!peer || peer.role !== "peer") {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.peerId, peer.id));

  if (!student) {
    res.json({ assigned: false });
    return;
  }

  const [coach] = student.coachId
    ? await db.select().from(usersTable).where(eq(usersTable.id, student.coachId))
    : [null];

  const tasks = await db
    .select({
      id: actionItemsTable.id,
      title: actionItemsTable.title,
      description: actionItemsTable.description,
      completed: actionItemsTable.completed,
    })
    .from(actionItemsTable)
    .where(eq(actionItemsTable.studentId, student.id));

  const goals = await db
    .select({
      id: smartGoalsTable.id,
      title: smartGoalsTable.title,
      status: smartGoalsTable.status,
    })
    .from(smartGoalsTable)
    .where(eq(smartGoalsTable.studentId, student.id));

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.studentId, student.id));

  res.json({
    assigned: true,
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      bio: student.bio ?? "",
    },
    tasks,
    goals,
    appointments: appointments.map((a) => ({
      id: a.id,
      title: a.title,
      scheduledAt: a.scheduledAt.toISOString(),
      coachName: coach ? `${coach.firstName} ${coach.lastName}` : null,
    })),
    triad: {
      studentName: `${student.firstName} ${student.lastName}`,
      coachName: coach ? `${coach.firstName} ${coach.lastName}` : null,
      peerName: `${peer.firstName} ${peer.lastName}`,
    },
  });
});

export default router;