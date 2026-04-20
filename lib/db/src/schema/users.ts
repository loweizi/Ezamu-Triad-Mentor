import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("student"),
  profilePicUrl: text("profile_pic_url"),
  innerHeroArchetype: text("inner_hero_archetype"),
  coachId: integer("coach_id"),
  peerId: integer("peer_id"),
  studentId: integer("student_id"),
  guardianId: integer("guardian_id"),
  bio: text("bio"),
  age: integer("age"),
  fieldsOfInterest: text("fields_of_interest").array().notNull().default([]),
  fieldsOfExpertise: text("fields_of_expertise").array().notNull().default([]),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
