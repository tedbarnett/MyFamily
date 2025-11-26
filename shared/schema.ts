import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Person categories for Judy's memory aid
export type PersonCategory = 
  | "husband" 
  | "children" 
  | "grandchildren" 
  | "friends" 
  | "caregivers";

// Person table schema
export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  relationship: text("relationship").notNull(), // e.g., "Husband", "Son", "Granddaughter"
  photoUrl: text("photo_url"),
  born: text("born"),
  age: integer("age"),
  passed: text("passed"),
  location: text("location"),
  spouse: text("spouse"),
  children: text("children").array(),
  summary: text("summary"),
  sortOrder: integer("sort_order").notNull().default(0),
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
