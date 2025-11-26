import { type Person, type InsertPerson, type PersonCategory, people } from "@shared/schema";
import { db } from "./db";
import { eq, or, like, sql } from "drizzle-orm";

export interface IStorage {
  getAllPeople(): Promise<Person[]>;
  getPeopleByCategory(category: PersonCategory): Promise<Person[]>;
  getPersonById(id: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: string, updates: Partial<Person>): Promise<Person | undefined>;
  deletePerson(id: string): Promise<boolean>;
  searchPeople(query: string): Promise<Person[]>;
  recordVisit(id: string, visitDate: string): Promise<Person | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getAllPeople(): Promise<Person[]> {
    const result = await db.select().from(people).orderBy(people.category, people.sortOrder);
    return result;
  }

  async getPeopleByCategory(category: PersonCategory): Promise<Person[]> {
    const result = await db
      .select()
      .from(people)
      .where(eq(people.category, category))
      .orderBy(people.sortOrder);
    return result;
  }

  async getPersonById(id: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person || undefined;
  }

  async createPerson(person: InsertPerson): Promise<Person> {
    const [created] = await db.insert(people).values(person).returning();
    return created;
  }

  async updatePerson(id: string, updates: Partial<Person>): Promise<Person | undefined> {
    const [updated] = await db
      .update(people)
      .set(updates)
      .where(eq(people.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePerson(id: string): Promise<boolean> {
    const result = await db.delete(people).where(eq(people.id, id)).returning();
    return result.length > 0;
  }

  async searchPeople(query: string): Promise<Person[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await db
      .select()
      .from(people)
      .where(
        or(
          sql`LOWER(${people.name}) LIKE ${searchTerm}`,
          sql`LOWER(${people.relationship}) LIKE ${searchTerm}`,
          sql`LOWER(${people.location}) LIKE ${searchTerm}`,
          sql`LOWER(${people.summary}) LIKE ${searchTerm}`
        )
      )
      .orderBy(people.category, people.sortOrder);
    return result;
  }

  async recordVisit(id: string, visitDate: string): Promise<Person | undefined> {
    const person = await this.getPersonById(id);
    if (!person) return undefined;

    const visitHistory = person.visitHistory || [];
    visitHistory.push(visitDate);

    return this.updatePerson(id, {
      lastVisit: visitDate,
      visitHistory,
    });
  }
}

export const storage = new DatabaseStorage();
