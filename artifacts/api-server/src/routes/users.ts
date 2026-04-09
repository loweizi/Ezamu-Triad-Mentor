import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
  OnboardUserBody,
  OnboardUserResponse,
  SearchUsersQueryParams,
  SearchUsersResponseItem,
} from "@workspace/api-zod";
import { clerkClient, getAuth } from "@clerk/express";

const router: IRouter = Router();

async function fetchClerkUser(
  clerkId: string
): Promise<{ email: string; firstName: string; lastName: string } | null> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
    const firstName = clerkUser.firstName ?? "";
    const lastName = clerkUser.lastName ?? "";
    return { email, firstName, lastName };
  } catch (error) {
    console.error("fetchClerkUser failed:", error);
    return null;
  }
}

async function getOrCreateUser(
  clerkId: string
): Promise<typeof usersTable.$inferSelect | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (user) return user;

  const clerkData = await fetchClerkUser(clerkId);
  if (!clerkData?.email) return null;

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

  if (created) return created;

  const [refetch] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return refetch ?? null;
}

router.get("/users/me", async (req, res): Promise<void> => {
  try {
    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await getOrCreateUser(userId);
    if (!user) {
      res.status(404).json({ error: "User not found. Complete sign-up first." });
      return;
    }

    res.json(
      GetMeResponse.parse({
        ...user,
        createdAt: user.createdAt.toISOString(),
      })
    );
  } catch (error) {
    console.error("GET /users/me failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/me", async (req, res): Promise<void> => {
  try {
    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await getOrCreateUser(userId);
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

    if (!updated) {
      res.status(500).json({ error: "Failed to update user" });
      return;
    }

    res.json(
      UpdateMeResponse.parse({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      })
    );
  } catch (error) {
    console.error("PATCH /users/me failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/onboard", async (req, res): Promise<void> => {
  try {
    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await getOrCreateUser(userId);
    if (!user) {
      res.status(500).json({ error: "Failed to create or load user" });
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
    if (parsed.data.fieldsOfInterest) updates.fieldsOfInterest = parsed.data.fieldsOfInterest;
    if (parsed.data.fieldsOfExpertise) updates.fieldsOfExpertise = parsed.data.fieldsOfExpertise;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, user.id))
      .returning();

    if (!updated) {
      res.status(500).json({ error: "Failed to update user" });
      return;
    }

    res.json(
      OnboardUserResponse.parse({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      })
    );
  } catch (error) {
    console.error("POST /users/onboard failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/search", async (req, res): Promise<void> => {
  try {
    const { isAuthenticated } = getAuth(req);

    if (!isAuthenticated) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

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
  } catch (error) {
    console.error("GET /users/search failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;