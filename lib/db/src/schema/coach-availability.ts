import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coachAvailabilityTable = pgTable("coach_availability", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCoachAvailabilitySchema = createInsertSchema(coachAvailabilityTable).omit({ id: true, createdAt: true });
export type InsertCoachAvailability = z.infer<typeof insertCoachAvailabilitySchema>;
export type CoachAvailability = typeof coachAvailabilityTable.$inferSelect;
