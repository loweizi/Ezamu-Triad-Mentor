import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assessmentResultsTable = pgTable("assessment_results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  innerHeroType: text("inner_hero_type").notNull(),
  helperScore: integer("helper_score").notNull().default(0),
  doerScore: integer("doer_score").notNull().default(0),
  thinkerScore: integer("thinker_score").notNull().default(0),
  plannerScore: integer("planner_score").notNull().default(0),
  summary: text("summary").notNull(),
  dateTaken: timestamp("date_taken", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssessmentResultSchema = createInsertSchema(assessmentResultsTable).omit({ id: true, dateTaken: true });
export type InsertAssessmentResult = z.infer<typeof insertAssessmentResultSchema>;
export type AssessmentResult = typeof assessmentResultsTable.$inferSelect;
