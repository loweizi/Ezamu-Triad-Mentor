import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Clerk webhook to create user records when they sign up
router.post("/webhooks/clerk", async (req, res): Promise<void> => {
  const event = req.body;
  if (!event || !event.type) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const clerkUser = event.data;
    const clerkId = clerkUser.id;
    const email = clerkUser.email_addresses?.[0]?.email_address ?? "";
    const firstName = clerkUser.first_name ?? "";
    const lastName = clerkUser.last_name ?? "";
    const profilePicUrl = clerkUser.image_url ?? null;

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!existing) {
      await db.insert(usersTable).values({
        clerkId,
        email,
        firstName,
        lastName,
        profilePicUrl,
        role: "student",
        fieldsOfInterest: [],
        fieldsOfExpertise: [],
        onboardingCompleted: false,
      });
      logger.info({ clerkId }, "Created user from Clerk webhook");
    } else if (event.type === "user.updated") {
      await db.update(usersTable).set({
        email,
        firstName,
        lastName,
        profilePicUrl,
      }).where(eq(usersTable.clerkId, clerkId));
    }
  }

  res.json({ received: true });
});

export default router;
