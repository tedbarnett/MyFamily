import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// FAMILIES - Multi-tenant support for multiple families
// ============================================================================

export const families = pgTable("families", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(), // URL-friendly identifier (e.g., "demo-family")
  name: text("name").notNull(), // Display name (e.g., "Demo Family")
  seniorName: text("senior_name").notNull(), // Name of the elderly user (e.g., "Mom")
  passwordHash: text("password_hash"), // Optional password for family admin access
  joinCode: text("join_code").unique(), // Code for inviting new family members
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
});

export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;

// ============================================================================
// FAMILY MEMBERS - People who can edit/manage the family's data
// ============================================================================

export type MemberRole = "admin" | "editor";

export const familyMembers = pgTable("family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull().references(() => families.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("editor"), // "admin" or "editor"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

// ============================================================================
// PERSON CATEGORIES
// ============================================================================

// Person categories for memory aid
export type PersonCategory = 
  | "husband" 
  | "children" 
  | "grandchildren" 
  | "daughters_in_law"
  | "sons_in_law"
  | "caregivers"
  | "other";

// ============================================================================
// PEOPLE - Family members/contacts to remember
// ============================================================================

export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id),
  
  // Basic info - same for everyone
  name: text("name").notNull(),
  category: text("category").notNull(),
  relationship: text("relationship").notNull(), // e.g., "Husband", "Son", "Granddaughter"
  
  // Dates
  born: text("born"),
  passed: text("passed"),
  
  // Contact info
  location: text("location"),
  phone: text("phone"),
  email: text("email"),
  
  // Relationships - use IDs instead of text names
  spouseId: varchar("spouse_id"), // References another person's ID
  parentIds: varchar("parent_ids").array(), // Array of parent person IDs
  
  // Photos
  photoData: text("photo_data"), // Primary photo (base64)
  thumbnailData: text("thumbnail_data"), // 512x512 thumbnail (base64)
  photos: text("photos").array(), // Additional photos (base64)
  
  // Notes & extras
  summary: text("summary"),
  sortOrder: integer("sort_order").notNull().default(0),
  voiceNoteData: text("voice_note_data"), // Audio note (base64)
  
  // Visit tracking
  lastVisit: text("last_visit"),
  visitHistory: text("visit_history").array(),
});

export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
});

export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof people.$inferSelect;

// Lightweight person list item (for admin/list views - uses thumbnails)
export interface PersonListItem {
  id: string;
  name: string;
  relationship: string;
  category: string;
  born: string | null;
  location: string | null;
  summary: string | null;
  sortOrder: number;
  thumbnailData: string | null;
  hasVoiceNote: boolean;
}

// Category information for navigation
export interface CategoryInfo {
  id: PersonCategory;
  label: string;
  description: string;
  count: number;
}

// ============================================================================
// QUIZ RESULTS - Tracking mental acuity over time
// ============================================================================

export const quizResults = pgTable("quiz_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id), // Multi-tenant: which family's quiz
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
