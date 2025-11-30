import { 
  type Person, type InsertPerson, type PersonCategory, people, 
  type QuizResult, type InsertQuizResult, quizResults,
  type Family, type InsertFamily, families,
  type FamilyMember, type InsertFamilyMember, familyMembers
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface CategoryStaticData {
  id: PersonCategory;
  count: number;
  description: string; // Dynamic description based on database (e.g., "John" for husband, "3 Sons" for children)
  backgroundPhotos: string[]; // All available photos for randomization
  singlePersonId: string | null;
}

export interface StaticHomeData {
  categories: CategoryStaticData[];
  totalPeople: number;
  generatedAt: string;
}

export interface IStorage {
  // Family management
  createFamily(family: InsertFamily & { password?: string }): Promise<Family>;
  getFamilyById(id: string): Promise<Family | undefined>;
  getFamilyBySlug(slug: string): Promise<Family | undefined>;
  updateFamily(id: string, updates: Partial<Family>): Promise<Family | undefined>;
  verifyFamilyPassword(familyId: string, password: string): Promise<boolean>;
  
  // Family member management
  createFamilyMember(member: Omit<InsertFamilyMember, 'passwordHash'> & { password: string }): Promise<FamilyMember>;
  getFamilyMemberById(id: string): Promise<FamilyMember | undefined>;
  getFamilyMemberByEmail(email: string, familyId: string): Promise<FamilyMember | undefined>;
  authenticateMember(email: string, password: string, familyId: string): Promise<FamilyMember | undefined>;
  getFamilyMembers(familyId: string): Promise<FamilyMember[]>;
  
  // People management (now family-scoped)
  getAllPeople(familyId?: string): Promise<Person[]>;
  getPeopleByCategory(category: PersonCategory, familyId?: string): Promise<Person[]>;
  getPersonById(id: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: string, updates: Partial<Person>): Promise<Person | undefined>;
  deletePerson(id: string): Promise<boolean>;
  searchPeople(query: string, familyId?: string): Promise<Person[]>;
  recordVisit(id: string, visitDate: string): Promise<Person | undefined>;
  
  // Quiz results (now family-scoped)
  saveQuizResult(result: InsertQuizResult): Promise<QuizResult>;
  getQuizResults(familyId?: string): Promise<QuizResult[]>;
  
  // Static data (now family-scoped)
  getStaticHomeData(familyId?: string): Promise<StaticHomeData>;
  
  // Cache management
  invalidateCache(): Promise<void>;
}

const ALL_CATEGORIES: PersonCategory[] = [
  "husband", "children", "grandchildren", "daughters_in_law", 
  "sons_in_law", "other", "caregivers"
];

const SALT_ROUNDS = 10;

export class CachedDatabaseStorage implements IStorage {
  private peopleCache: Person[] | null = null;
  private cacheLoading: Promise<Person[]> | null = null;
  private quizCache: QuizResult[] | null = null;
  private staticHomeDataCache: Map<string, StaticHomeData> = new Map();

  // ============================================================================
  // FAMILY MANAGEMENT
  // ============================================================================

  async createFamily(input: InsertFamily & { password?: string }): Promise<Family> {
    const { password, ...familyData } = input;
    
    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }
    
    // Generate a random join code
    const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const [created] = await db.insert(families).values({
      ...familyData,
      passwordHash,
      joinCode,
    }).returning();
    
    return created;
  }

  async getFamilyById(id: string): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.id, id));
    return family || undefined;
  }

  async getFamilyBySlug(slug: string): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.slug, slug));
    return family || undefined;
  }

  async updateFamily(id: string, updates: Partial<Family>): Promise<Family | undefined> {
    const [updated] = await db
      .update(families)
      .set(updates)
      .where(eq(families.id, id))
      .returning();
    return updated || undefined;
  }

  async verifyFamilyPassword(familyId: string, password: string): Promise<boolean> {
    const family = await this.getFamilyById(familyId);
    if (!family || !family.passwordHash) return false;
    return bcrypt.compare(password, family.passwordHash);
  }

  // ============================================================================
  // FAMILY MEMBER MANAGEMENT
  // ============================================================================

  async createFamilyMember(input: Omit<InsertFamilyMember, 'passwordHash'> & { password: string }): Promise<FamilyMember> {
    const { password, ...memberData } = input;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const [created] = await db.insert(familyMembers).values({
      ...memberData,
      passwordHash,
    }).returning();
    
    return created;
  }

  async getFamilyMemberById(id: string): Promise<FamilyMember | undefined> {
    const [member] = await db.select().from(familyMembers).where(eq(familyMembers.id, id));
    return member || undefined;
  }

  async getFamilyMemberByEmail(email: string, familyId: string): Promise<FamilyMember | undefined> {
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(and(
        eq(familyMembers.email, email.toLowerCase()),
        eq(familyMembers.familyId, familyId)
      ));
    return member || undefined;
  }

  async authenticateMember(email: string, password: string, familyId: string): Promise<FamilyMember | undefined> {
    const member = await this.getFamilyMemberByEmail(email.toLowerCase(), familyId);
    if (!member || !member.isActive) return undefined;
    
    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) return undefined;
    
    // Update last login
    await db
      .update(familyMembers)
      .set({ lastLoginAt: new Date() })
      .where(eq(familyMembers.id, member.id));
    
    return member;
  }

  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    return db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
  }

  // ============================================================================
  // PEOPLE CACHE MANAGEMENT
  // ============================================================================

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
      return this.peopleCache;
    } finally {
      this.cacheLoading = null;
    }
  }

  private generateCategoryDescription(categoryId: PersonCategory, categoryPeople: Person[]): string {
    const count = categoryPeople.length;
    
    if (count === 0) return "";
    
    switch (categoryId) {
      case "husband":
        return categoryPeople[0]?.name || "";
      case "children":
        return `${count} ${count === 1 ? "Son" : "Sons"}`;
      case "grandchildren":
        return `${count} ${count === 1 ? "Grandchild" : "Grandchildren"}`;
      case "daughters_in_law":
        return `${count} ${count === 1 ? "Daughter in Law" : "Daughters in Law"}`;
      case "sons_in_law":
        return `${count} ${count === 1 ? "Son in Law" : "Sons in Law"}`;
      case "other":
        return `${count} ${count === 1 ? "Friend" : "Friends"}`;
      case "caregivers":
        return `${count} ${count === 1 ? "Caregiver" : "Caregivers"}`;
      default:
        return `${count}`;
    }
  }

  private generateStaticDataForFamily(familyPeople: Person[]): StaticHomeData {
    const categories: CategoryStaticData[] = ALL_CATEGORIES.map(categoryId => {
      const categoryPeople = familyPeople.filter(p => p.category === categoryId);
      const peopleWithPhotos = categoryPeople.filter(p => p.thumbnailData || p.photoData);
      
      // Use thumbnails for faster loading (much smaller than full photos)
      const backgroundPhotos = peopleWithPhotos
        .map(p => p.thumbnailData || p.photoData)
        .filter((photo): photo is string => photo !== null);
      
      // Generate dynamic description based on category and people
      const description = this.generateCategoryDescription(categoryId, categoryPeople);
      
      return {
        id: categoryId,
        count: categoryPeople.length,
        description,
        backgroundPhotos,
        singlePersonId: categoryPeople.length === 1 ? categoryPeople[0].id : null,
      };
    });

    return {
      categories,
      totalPeople: familyPeople.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private invalidatePeopleCache(): void {
    console.log("Invalidating people cache");
    this.peopleCache = null;
    this.staticHomeDataCache.clear();
  }
  
  // Public cache invalidation
  async invalidateCache(): Promise<void> {
    this.invalidatePeopleCache();
    this.invalidateQuizCache();
  }

  private invalidateQuizCache(): void {
    this.quizCache = null;
  }

  // ============================================================================
  // STATIC DATA
  // ============================================================================

  async getStaticHomeData(familyId?: string): Promise<StaticHomeData> {
    const cacheKey = familyId || '__all__';
    
    if (this.staticHomeDataCache.has(cacheKey)) {
      return this.staticHomeDataCache.get(cacheKey)!;
    }
    
    const allPeople = await this.loadPeopleCache();
    const filteredPeople = familyId 
      ? allPeople.filter(p => p.familyId === familyId)
      : allPeople;
    
    const staticData = this.generateStaticDataForFamily(filteredPeople);
    this.staticHomeDataCache.set(cacheKey, staticData);
    
    return staticData;
  }

  // ============================================================================
  // PEOPLE CRUD OPERATIONS
  // ============================================================================

  async getAllPeople(familyId?: string): Promise<Person[]> {
    const allPeople = await this.loadPeopleCache();
    if (familyId) {
      return allPeople.filter(p => p.familyId === familyId);
    }
    return allPeople;
  }

  async getPeopleByCategory(category: PersonCategory, familyId?: string): Promise<Person[]> {
    const allPeople = await this.loadPeopleCache();
    return allPeople
      .filter(p => p.category === category && (!familyId || p.familyId === familyId))
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

  async searchPeople(query: string, familyId?: string): Promise<Person[]> {
    const allPeople = await this.loadPeopleCache();
    const searchTerm = query.toLowerCase();
    
    return allPeople.filter(p => 
      (!familyId || p.familyId === familyId) &&
      (p.name.toLowerCase().includes(searchTerm) ||
      (p.relationship && p.relationship.toLowerCase().includes(searchTerm)) ||
      (p.location && p.location.toLowerCase().includes(searchTerm)) ||
      (p.summary && p.summary.toLowerCase().includes(searchTerm)))
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

  // ============================================================================
  // QUIZ RESULTS
  // ============================================================================

  async saveQuizResult(result: InsertQuizResult): Promise<QuizResult> {
    const [created] = await db.insert(quizResults).values(result).returning();
    this.invalidateQuizCache();
    return created;
  }

  async getQuizResults(familyId?: string): Promise<QuizResult[]> {
    if (familyId) {
      return db
        .select()
        .from(quizResults)
        .where(eq(quizResults.familyId, familyId))
        .orderBy(desc(quizResults.completedAt));
    }
    
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
