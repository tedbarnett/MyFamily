import { type Person, type InsertPerson, type PersonCategory, people, type QuizResult, type InsertQuizResult, quizResults } from "@shared/schema";
import { db } from "./db";
import { eq, or, like, sql, desc } from "drizzle-orm";

export interface IStorage {
  getAllPeople(): Promise<Person[]>;
  getPeopleByCategory(category: PersonCategory): Promise<Person[]>;
  getPersonById(id: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: string, updates: Partial<Person>): Promise<Person | undefined>;
  deletePerson(id: string): Promise<boolean>;
  searchPeople(query: string): Promise<Person[]>;
  recordVisit(id: string, visitDate: string): Promise<Person | undefined>;
  saveQuizResult(result: InsertQuizResult): Promise<QuizResult>;
  getQuizResults(): Promise<QuizResult[]>;
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

  async saveQuizResult(result: InsertQuizResult): Promise<QuizResult> {
    const [created] = await db.insert(quizResults).values(result).returning();
    return created;
  }

  async getQuizResults(): Promise<QuizResult[]> {
    const results = await db
      .select()
      .from(quizResults)
      .orderBy(desc(quizResults.completedAt));
    return results;
  }
}

export const storage = new DatabaseStorage();
