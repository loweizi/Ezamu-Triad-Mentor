import { Router, type IRouter } from "express";
import { eq, or, inArray } from "drizzle-orm";
import { db, appointmentsTable, usersTable, assessmentResultsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/coach/students", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [coach] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!coach) { res.status(404).json({ error: "User not found" }); return; }
  if (coach.role !== "coach") { res.status(403).json({ error: "Only coaches can access this endpoint" }); return; }

  const appointments = await db.select().from(appointmentsTable).where(eq(appointmentsTable.coachId, coach.id));

  const studentIdSet = new Set(appointments.map(a => a.studentId));
  const studentIds = Array.from(studentIdSet);

  if (studentIds.length === 0) {
    res.json([]);
    return;
  }

  const students = await db.select().from(usersTable).where(inArray(usersTable.id, studentIds));

  const studentAppointments = appointments.reduce<Record<number, typeof appointments>>((acc, appt) => {
    if (!acc[appt.studentId]) acc[appt.studentId] = [];
    acc[appt.studentId].push(appt);
    return acc;
  }, {});

  const now = new Date();
  const result = students.map(s => {
    const appts = studentAppointments[s.id] || [];
    const upcoming = appts
      .filter(a => new Date(a.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
    const lastMet = appts
      .filter(a => new Date(a.scheduledAt) <= now)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      profilePicUrl: s.profilePicUrl,
      innerHeroArchetype: s.innerHeroArchetype,
      fieldsOfInterest: s.fieldsOfInterest ?? [],
      bio: s.bio,
      age: s.age,
      nextAppointmentAt: upcoming ? upcoming.scheduledAt.toISOString() : null,
      lastAppointmentAt: lastMet ? lastMet.scheduledAt.toISOString() : null,
      totalAppointments: appts.length,
    };
  });

  res.json(result);
});

router.get("/coach/students/:studentId", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const [coach] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!coach) { res.status(404).json({ error: "User not found" }); return; }
  if (coach.role !== "coach") { res.status(403).json({ error: "Only coaches can access this endpoint" }); return; }

  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student ID" }); return; }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const appointments = await db.select().from(appointmentsTable).where(
    eq(appointmentsTable.coachId, coach.id)
  ).then(appts => appts.filter(a => a.studentId === studentId));

  const assessmentResult = await db.select().from(assessmentResultsTable)
    .where(eq(assessmentResultsTable.userId, studentId))
    .then(rows => rows[0] ?? null);

  const now = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;

  res.json({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    profilePicUrl: student.profilePicUrl,
    innerHeroArchetype: student.innerHeroArchetype,
    fieldsOfInterest: student.fieldsOfInterest ?? [],
    bio: student.bio,
    age: student.age,
    createdAt: student.createdAt.toISOString(),
    totalAppointments: appointments.length,
    nextAppointmentAt: upcoming ? upcoming.scheduledAt.toISOString() : null,
    assessmentResult: assessmentResult ? {
      archetype: assessmentResult.archetype,
      completedAt: assessmentResult.completedAt?.toISOString() ?? null,
    } : null,
    appointments: appointments
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        scheduledAt: a.scheduledAt.toISOString(),
        status: a.status,
      })),
  });
});

export default router;
