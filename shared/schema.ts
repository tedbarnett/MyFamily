import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Person categories for Judy's memory aid
export type PersonCategory = 
  | "husband" 
  | "children" 
  | "grandchildren" 
  | "daughters_in_law"
  | "caregivers"
  | "other";

// Person table schema
export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fullName: text("full_name"), // Full legal name (for husband, children, grandchildren)
  category: text("category").notNull(),
  relationship: text("relationship").notNull(), // e.g., "Husband", "Son", "Granddaughter"
  photoUrl: text("photo_url"),
  photoData: text("photo_data"), // Base64 encoded photo for uploads (primary/active photo)
  thumbnailData: text("thumbnail_data"), // 512x512 thumbnail version of primary photo (base64)
  photos: text("photos").array(), // Array of base64 encoded photos for multiple images
  born: text("born"),
  age: integer("age"),
  passed: text("passed"),
  location: text("location"),
  spouse: text("spouse"),
  children: text("children").array(),
  summary: text("summary"),
  sortOrder: integer("sort_order").notNull().default(0),
  lastVisit: text("last_visit"), // ISO date string of last visit
  visitHistory: text("visit_history").array(), // Array of ISO date strings
  voiceNoteData: text("voice_note_data"), // Base64 encoded audio for uploads
});

export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
});

export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof people.$inferSelect;

// Category information for navigation
export interface CategoryInfo {
  id: PersonCategory;
  label: string;
  description: string;
  count: number;
}

// Quiz results table schema for tracking mental acuity over time
export const quizResults = pgTable("quiz_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  completedAt: true,
});

export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResults.$inferSelect;
