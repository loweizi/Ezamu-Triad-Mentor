import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";


export const guardianRequestsTable = pgTable("guardian_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  guardianEmail: text("guardian_email").notNull(),
  guardianUserId: integer("guardian_user_id"),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGuardianRequestSchema = createInsertSchema(guardianRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuardianRequest = z.infer<typeof insertGuardianRequestSchema>;
export type GuardianRequest = typeof guardianRequestsTable.$inferSelect;
