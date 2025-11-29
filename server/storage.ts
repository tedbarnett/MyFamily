import { type Person, type InsertPerson, type PersonCategory, people, type QuizResult, type InsertQuizResult, quizResults } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface CategoryStaticData {
  id: PersonCategory;
  count: number;
  backgroundPhoto: string | null;
  singlePersonId: string | null;
}

export interface StaticHomeData {
  categories: CategoryStaticData[];
  totalPeople: number;
  generatedAt: string;
}

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
  getStaticHomeData(): Promise<StaticHomeData>;
}

const ALL_CATEGORIES: PersonCategory[] = [
  "husband", "children", "grandchildren", "daughters_in_law", 
  "other", "caregivers"
];

export class CachedDatabaseStorage implements IStorage {
  private peopleCache: Person[] | null = null;
  private cacheLoading: Promise<Person[]> | null = null;
  private quizCache: QuizResult[] | null = null;
  private staticHomeData: StaticHomeData | null = null;

  private async loadPeopleCache(): Promise<Person[]> {
    if (this.peopleCache !== null) {
      return this.peopleCache;
    }
    
    if (this.cacheLoading !== null) {
      return this.cacheLoading;
    }

    console.log("Loading people cache from database...");
    this.cacheLoading = db.select().from(people).orderBy(people.category, people.sortOrder);
    
    try {
      this.peopleCache = await this.cacheLoading;
      console.log(`Cached ${this.peopleCache.length} people in memory`);
      this.regenerateStaticData();
      return this.peopleCache;
    } finally {
      this.cacheLoading = null;
    }
  }

  private regenerateStaticData(): void {
    if (!this.peopleCache) return;
    
    // Only regenerate if not already generated (static data persists until cache invalidation)
    if (this.staticHomeData) return;
    
    console.log("Regenerating static home data...");
    const categories: CategoryStaticData[] = ALL_CATEGORIES.map(categoryId => {
      const categoryPeople = this.peopleCache!.filter(p => p.category === categoryId);
      const peopleWithPhotos = categoryPeople.filter(p => p.photoData || p.photoUrl);
      
      // Use deterministic selection: first person with a photo (sorted by sortOrder)
      let backgroundPhoto: string | null = null;
      if (peopleWithPhotos.length > 0) {
        const firstPerson = peopleWithPhotos[0];
        backgroundPhoto = firstPerson.photoData || firstPerson.photoUrl || null;
      }
      
      return {
        id: categoryId,
        count: categoryPeople.length,
        backgroundPhoto,
        singlePersonId: categoryPeople.length === 1 ? categoryPeople[0].id : null,
      };
    });

    this.staticHomeData = {
      categories,
      totalPeople: this.peopleCache.length,
      generatedAt: new Date().toISOString(),
    };
    console.log("Static home data generated");
  }

  private invalidatePeopleCache(): void {
    console.log("Invalidating people cache");
    this.peopleCache = null;
    this.staticHomeData = null;
  }

  private invalidateQuizCache(): void {
    this.quizCache = null;
  }

  async getStaticHomeData(): Promise<StaticHomeData> {
    if (this.staticHomeData) {
      return this.staticHomeData;
    }
    await this.loadPeopleCache();
    return this.staticHomeData!;
  }

  async getAllPeople(): Promise<Person[]> {
    return this.loadPeopleCache();
  }

  async getPeopleByCategory(category: PersonCategory): Promise<Person[]> {
    const allPeople = await this.loadPeopleCache();
    return allPeople
      .filter(p => p.category === category)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async getPersonById(id: string): Promise<Person | undefined> {
    const allPeople = await this.loadPeopleCache();
    return allPeople.find(p => p.id === id);
  }

  async createPerson(person: InsertPerson): Promise<Person> {
    const [created] = await db.insert(people).values(person).returning();
    this.invalidatePeopleCache();
    return created;
  }

  async updatePerson(id: string, updates: Partial<Person>): Promise<Person | undefined> {
    const [updated] = await db
      .update(people)
      .set(updates)
      .where(eq(people.id, id))
      .returning();
    
    if (updated) {
      this.invalidatePeopleCache();
    }
    return updated || undefined;
  }

  async deletePerson(id: string): Promise<boolean> {
    const result = await db.delete(people).where(eq(people.id, id)).returning();
    if (result.length > 0) {
      this.invalidatePeopleCache();
    }
    return result.length > 0;
  }

  async searchPeople(query: string): Promise<Person[]> {
    const allPeople = await this.loadPeopleCache();
    const searchTerm = query.toLowerCase();
    
    return allPeople.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      (p.relationship && p.relationship.toLowerCase().includes(searchTerm)) ||
      (p.location && p.location.toLowerCase().includes(searchTerm)) ||
      (p.summary && p.summary.toLowerCase().includes(searchTerm))
    );
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
    this.invalidateQuizCache();
    return created;
  }

  async getQuizResults(): Promise<QuizResult[]> {
    if (this.quizCache !== null) {
      return this.quizCache;
    }
    
    this.quizCache = await db
      .select()
      .from(quizResults)
      .orderBy(desc(quizResults.completedAt));
    return this.quizCache;
  }
}

export const storage = new CachedDatabaseStorage();
