import { Router, type IRouter } from "express";
import { eq, ilike, or, and } from "drizzle-orm";
import {
  actionItemsTable,
  appointmentsTable,
  assessmentResultsTable,
  coachAvailabilityTable,
  coachNotesTable,
  db,
  guardianRequestsTable,
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
        .set({ coachId: null, studentId: null })
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
          .set({ coachId: null, studentId: null })
          .where(eq(usersTable.id, user.peerId));
      }

      // If this student had a guardian, release that guardian
      if (user.guardianId) {
        await tx
          .update(usersTable)
          .set({ studentId: null })
          .where(eq(usersTable.id, user.guardianId));
      }

    }

    if (user.role === "peer") {
      // Student keeps coach, loses peer
      await tx
        .update(usersTable)
        .set({ peerId: null })
        .where(eq(usersTable.peerId, user.id));

      // Existing coach-student appointments should remain, just remove peer from them
      if (user.studentId) {
        await tx
          .update(usersTable)
          .set({ peerId: null })
          .where(eq(usersTable.id, user.studentId));
      }

      await tx
        .update(appointmentsTable)
        .set({ peerId: null })
        .where(eq(appointmentsTable.peerId, user.id));
    }

    if (user.role === "guardian") {
      if (user.studentId) {
        await tx
          .update(usersTable)
          .set({ guardianId: null })
          .where(eq(usersTable.id, user.studentId));
      }
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
    // If this student already has a peer, release that old peer first
    if (student.peerId) {
      await tx
        .update(usersTable)
        .set({ coachId: null, studentId: null })
        .where(eq(usersTable.id, student.peerId));
    }

    // If this peer is already assigned to another student, clear that student's peerId
    if (peer.studentId) {
      await tx
        .update(usersTable)
        .set({ peerId: null })
        .where(eq(usersTable.id, peer.studentId));
    }

    // Assign peer to this student
    await tx
      .update(usersTable)
      .set({
        coachId: coach.id,
        peerId: peer.id,
      })
      .where(eq(usersTable.id, student.id));

    // Mark peer as assigned to this student and coach
    await tx
      .update(usersTable)
      .set({
        coachId: coach.id,
        studentId: student.id,
      })
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
      .set({ coachId: null, studentId: null })
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

router.post("/users/assign-guardian", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const coach = await getOrCreateUser(clerkId);

  if (!coach || coach.role !== "coach") {
    res.status(403).json({ error: "Only coaches can assign guardians" });
    return;
  }

  const { studentId, guardianId } = req.body ?? {};

  if (typeof studentId !== "number" || typeof guardianId !== "number") {
    res.status(400).json({ error: "studentId and guardianId must be numbers" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, studentId));

  const [guardian] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, guardianId));

  if (!student || student.role !== "student") {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (!guardian || guardian.role !== "guardian") {
    res.status(404).json({ error: "Guardian not found" });
    return;
  }

  if (student.coachId && student.coachId !== coach.id) {
    res.status(403).json({ error: "This student belongs to another coach" });
    return;
  }

  await db.transaction(async (tx) => {
    // If this student already has a guardian, release that old guardian first
    if (student.guardianId) {
      await tx
        .update(usersTable)
        .set({ studentId: null })
        .where(eq(usersTable.id, student.guardianId));
    }

    // If this guardian is already linked to another student, clear that student's guardianId
    if (guardian.studentId) {
      await tx
        .update(usersTable)
        .set({ guardianId: null })
        .where(eq(usersTable.id, guardian.studentId));
    }

    // Assign guardian to this student
    await tx
      .update(usersTable)
      .set({ guardianId: guardian.id })
      .where(eq(usersTable.id, student.id));

    // Mark guardian as linked to this student
    await tx
      .update(usersTable)
      .set({ studentId: student.id })
      .where(eq(usersTable.id, guardian.id));
  });

  res.json({ message: "Guardian assigned successfully" });
});
router.post("/users/guardian-requests", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const student = await getOrCreateUser(clerkId);

  if (!student || student.role !== "student") {
    res.status(403).json({ error: "Only students can invite guardians" });
    return;
  }

  const { guardianEmail } = req.body ?? {};

  if (!guardianEmail || typeof guardianEmail !== "string") {
    res.status(400).json({ error: "guardianEmail is required" });
    return;
  }

  const normalizedEmail = guardianEmail.trim().toLowerCase();

  if (!normalizedEmail) {
    res.status(400).json({ error: "guardianEmail is required" });
    return;
  }

  if (normalizedEmail === student.email.toLowerCase()) {
    res.status(400).json({ error: "You cannot invite your own email as guardian" });
    return;
  }

  if (student.guardianId) {
    res.status(400).json({ error: "A guardian is already connected to this student" });
    return;
  }

  const [existingGuardianUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existingGuardianUser && existingGuardianUser.role !== "guardian") {
    res.status(400).json({ error: "That email already belongs to a non-guardian account" });
    return;
  }

  const [existingPending] = await db
    .select()
    .from(guardianRequestsTable)
    .where(
      and(
        eq(guardianRequestsTable.studentId, student.id),
        eq(guardianRequestsTable.guardianEmail, normalizedEmail),
        eq(guardianRequestsTable.status, "pending"),
      )
    );

  if (existingPending) {
    res.status(409).json({ error: "A pending guardian invite already exists for that email" });
    return;
  }

  const [created] = await db
    .insert(guardianRequestsTable)
    .values({
      studentId: student.id,
      guardianEmail: normalizedEmail,
      guardianUserId: existingGuardianUser?.id ?? null,
      status: "pending",
    })
    .returning();

  if (existingGuardianUser?.id) {
    await db.insert(notificationsTable).values({
      userId: existingGuardianUser.id,
      type: "guardian_invite",
      message: `${student.firstName} ${student.lastName} invited you to connect as their guardian.`,
      relatedId: created.id,
      read: false,
    });
  }

  res.status(201).json({
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  });
});
router.get("/users/guardian-requests", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const me = await getOrCreateUser(clerkId);

  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (me.role === "student") {
    const requests = await db
      .select()
      .from(guardianRequestsTable)
      .where(eq(guardianRequestsTable.studentId, me.id));

    res.json(
      requests.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
    return;
  }

  if (me.role === "guardian") {
    const requests = await db
      .select()
      .from(guardianRequestsTable)
      .where(eq(guardianRequestsTable.guardianEmail, me.email.toLowerCase()));

    const studentIds = [...new Set(requests.map((r) => r.studentId))];
    const students =
      studentIds.length > 0
        ? await db.select().from(usersTable).where(or(...studentIds.map((id) => eq(usersTable.id, id))))
        : [];

    const studentsById = Object.fromEntries(students.map((s) => [s.id, s]));

    res.json(
      requests.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        student: studentsById[r.studentId]
          ? {
            id: studentsById[r.studentId].id,
            firstName: studentsById[r.studentId].firstName,
            lastName: studentsById[r.studentId].lastName,
            email: studentsById[r.studentId].email,
            profilePicUrl: studentsById[r.studentId].profilePicUrl,
          }
          : null,
      }))
    );
    return;
  }

  res.status(403).json({ error: "Only students and guardians can view guardian requests" });
});
router.patch("/users/guardian-requests/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const me = await getOrCreateUser(clerkId);

  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (me.role !== "guardian") {
    res.status(403).json({ error: "Only guardians can respond to guardian requests" });
    return;
  }

  const rawRequestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const requestId = parseInt(rawRequestId, 10);
  const { status } = req.body ?? {};

  if (isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }

  if (!["accepted", "rejected"].includes(status)) {
    res.status(400).json({ error: "Status must be accepted or rejected" });
    return;
  }

  const [request] = await db
    .select()
    .from(guardianRequestsTable)
    .where(eq(guardianRequestsTable.id, requestId));

  if (!request) {
    res.status(404).json({ error: "Guardian request not found" });
    return;
  }

  if (request.guardianEmail.toLowerCase() !== me.email.toLowerCase()) {
    res.status(403).json({ error: "This request is not for your account" });
    return;
  }

  if (request.status !== "pending") {
    res.status(400).json({ error: "This guardian request has already been handled" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, request.studentId));

  if (!student || student.role !== "student") {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (status === "accepted") {
    await db.transaction(async (tx) => {
      if (student.guardianId && student.guardianId !== me.id) {
        await tx
          .update(usersTable)
          .set({ studentId: null })
          .where(eq(usersTable.id, student.guardianId));
      }

      if (me.studentId && me.studentId !== student.id) {
        await tx
          .update(usersTable)
          .set({ guardianId: null })
          .where(eq(usersTable.id, me.studentId));
      }

      await tx
        .update(usersTable)
        .set({ guardianId: me.id })
        .where(eq(usersTable.id, student.id));

      await tx
        .update(usersTable)
        .set({ studentId: student.id })
        .where(eq(usersTable.id, me.id));

      await tx
        .update(guardianRequestsTable)
        .set({
          status: "accepted",
          guardianUserId: me.id,
          updatedAt: new Date(),
        })
        .where(eq(guardianRequestsTable.id, request.id));

      await tx
        .update(guardianRequestsTable)
        .set({
          status: "rejected",
          guardianUserId: me.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(guardianRequestsTable.guardianEmail, me.email.toLowerCase()),
            eq(guardianRequestsTable.studentId, student.id),
            eq(guardianRequestsTable.status, "pending"),
          )
        );
    });

    res.json({ message: "Guardian request accepted successfully" });
    return;
  }

  await db
    .update(guardianRequestsTable)
    .set({
      status: "rejected",
      guardianUserId: me.id,
      updatedAt: new Date(),
    })
    .where(eq(guardianRequestsTable.id, request.id));

  res.json({ message: "Guardian request rejected" });
});
router.post("/users/remove-guardian", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const coach = await getOrCreateUser(clerkId);

  if (!coach || coach.role !== "coach") {
    res.status(403).json({ error: "Only coaches can remove guardians" });
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

  if (!student.guardianId) {
    res.status(400).json({ error: "This student does not have a guardian assigned" });
    return;
  }

  const guardianId = student.guardianId;

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ guardianId: null })
      .where(eq(usersTable.id, student.id));

    await tx
      .update(usersTable)
      .set({ studentId: null })
      .where(eq(usersTable.id, guardianId));
  });

  res.json({ message: "Guardian removed successfully" });
});

router.get("/users/available-peers", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const coach = await getOrCreateUser(clerkId);

  if (!coach || coach.role !== "coach") {
    res.status(403).json({ error: "Only coaches can view peers" });
    return;
  }

  const rawPeers = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      profilePicUrl: usersTable.profilePicUrl,
      bio: usersTable.bio,
      age: usersTable.age,
      fieldsOfInterest: usersTable.fieldsOfInterest,
      fieldsOfExpertise: usersTable.fieldsOfExpertise,
      studentId: usersTable.studentId,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "peer"),
        eq(usersTable.onboardingCompleted, true),
      )
    );

  const assignedPeerLinks = await db
    .select({ peerId: usersTable.peerId })
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  const assignedPeerIdSet = new Set(
    assignedPeerLinks
      .map((row) => row.peerId)
      .filter((id): id is number => id !== null)
  );

  const availablePeers = rawPeers.filter(
    (peer) => peer.studentId == null && !assignedPeerIdSet.has(peer.id)
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

router.get("/users/available-guardians", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const coach = await getOrCreateUser(clerkId);

  if (!coach || coach.role !== "coach") {
    res.status(403).json({ error: "Only coaches can view guardians" });
    return;
  }

  const rawGuardians = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      profilePicUrl: usersTable.profilePicUrl,
      bio: usersTable.bio,
      age: usersTable.age,
      studentId: usersTable.studentId,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "guardian"),
        eq(usersTable.onboardingCompleted, true),
      )
    );

  const availableGuardians = rawGuardians.filter(
    (guardian) => guardian.studentId == null
  );

  res.json(
    availableGuardians.map((g) => ({
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      name: `${g.firstName} ${g.lastName}`,
      email: g.email,
      profilePicUrl: g.profilePicUrl ?? null,
      bio: g.bio ?? "",
      age: g.age ?? null,
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

  if (!peer.studentId) {
    res.json({ assigned: false });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, peer.studentId));

  if (!student) {
    res.json({ assigned: false });
    return;
  }

  const [coach] = student.coachId
    ? await db.select().from(usersTable).where(eq(usersTable.id, student.coachId))
    : [null];

  const [guardian] = student.guardianId
    ? await db.select().from(usersTable).where(eq(usersTable.id, student.guardianId))
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
      specific: smartGoalsTable.specific,
      measurable: smartGoalsTable.measurable,
      achievable: smartGoalsTable.achievable,
      relevant: smartGoalsTable.relevant,
      timeBound: smartGoalsTable.timeBound,
      coachFeedback: smartGoalsTable.coachFeedback,
      createdAt: smartGoalsTable.createdAt,
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
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      specific: g.specific ?? "",
      measurable: g.measurable ?? "",
      achievable: g.achievable ?? "",
      relevant: g.relevant ?? "",
      timeBound: g.timeBound ? g.timeBound.toString() : null,
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      title: a.title,
      scheduledAt: a.scheduledAt.toISOString(),
      coachName: coach ? `${coach.firstName} ${coach.lastName}` : null,
    })),
    triad: {
      studentName: `${student.firstName} ${student.lastName}`,
      coachName: coach ? `${coach.firstName} ${coach.lastName}` : "No coach is connected",
      peerName: `${peer.firstName} ${peer.lastName}`,
      guardianName: guardian
        ? `${guardian.firstName} ${guardian.lastName}`
        : "No guardian is connected",
    },
  });
});

export default router;