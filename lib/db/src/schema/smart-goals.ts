import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const smartGoalsTable = pgTable("smart_goals", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  coachId: integer("coach_id").notNull(),
  title: text("title").notNull(),
  specific: text("specific").notNull(),
  measurable: text("measurable").notNull(),
  achievable: text("achievable").notNull(),
  relevant: text("relevant").notNull(),
  timeBound: text("time_bound").notNull(),
  status: text("status").notNull().default("pending"),
  coachFeedback: text("coach_feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SmartGoal = typeof smartGoalsTable.$inferSelect;

export const CreateSmartGoalSchema = z.object({
  coachId: z.number(),
  title: z.string().min(1),
  specific: z.string().min(1),
  measurable: z.string().min(1),
  achievable: z.string().min(1),
  relevant: z.string().min(1),
  timeBound: z.string().min(1),
});

export const UpdateSmartGoalSchema = z.object({
  status: z.enum(["pending", "approved", "denied"]).optional(),
  coachFeedback: z.string().optional(),
});
