import { Router, type IRouter } from "express";
import { eq, or, and, gte } from "drizzle-orm";
import { db, appointmentsTable, usersTable } from "@workspace/db";
import {
  GetAppointmentsResponseItem,
  CreateAppointmentBody,
  GetAppointmentParams,
  GetAppointmentResponse,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  UpdateAppointmentResponse,
  DeleteAppointmentParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function formatAppointment(appt: typeof appointmentsTable.$inferSelect) {
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, appt.studentId));
  const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, appt.coachId));
  return {
    ...appt,
    scheduledAt: appt.scheduledAt.toISOString(),
    studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
    coachName: coach ? `${coach.firstName} ${coach.lastName}` : "Unknown",
  };
}

router.get("/appointments", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let appts;
  if (user.role === "student") {
    appts = await db.select().from(appointmentsTable).where(eq(appointmentsTable.studentId, user.id));
  } else if (user.role === "coach") {
    appts = await db.select().from(appointmentsTable).where(eq(appointmentsTable.coachId, user.id));
  } else {
    appts = [];
  }

  const formatted = await Promise.all(appts.map(formatAppointment));
  res.json(formatted.map(a => GetAppointmentsResponseItem.parse(a)));
});

router.post("/appointments", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [appt] = await db.insert(appointmentsTable).values({
    studentId: user.id,
    coachId: parsed.data.coachId,
    peerId: parsed.data.peerId ?? null,
    title: parsed.data.title,
    scheduledAt: new Date(parsed.data.scheduledAt),
    status: "pending",
  }).returning();
  const formatted = await formatAppointment(appt);
  res.status(201).json(GetAppointmentResponse.parse(formatted));
});

router.get("/appointments/:appointmentId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.appointmentId) ? req.params.appointmentId[0] : req.params.appointmentId;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const formatted = await formatAppointment(appt);
  res.json(GetAppointmentResponse.parse(formatted));
});

router.patch("/appointments/:appointmentId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.appointmentId) ? req.params.appointmentId[0] : req.params.appointmentId;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof appointmentsTable.$inferInsert> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.scheduledAt) updates.scheduledAt = new Date(parsed.data.scheduledAt);

  const [updated] = await db.update(appointmentsTable).set(updates).where(eq(appointmentsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const formatted = await formatAppointment(updated);
  res.json(UpdateAppointmentResponse.parse(formatted));
});

router.delete("/appointments/:appointmentId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.appointmentId) ? req.params.appointmentId[0] : req.params.appointmentId;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));
  res.sendStatus(204);
});

export default router;
