import { 
  type Person, type InsertPerson, type PersonCategory, people, 
  type QuizResult, type InsertQuizResult, quizResults,
  type Family, type InsertFamily, families,
  type FamilyMember, type InsertFamilyMember, familyMembers,
  type PageView, type InsertPageView, pageViews,
  type AnalyticsSummary, type DailyPageViews, type PageViewsByRoute
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface BackgroundPhoto {
  photo: string;           // Base64 photo data
  eyeCenterY?: number;     // Normalized eye position (0=top, 1=bottom) - undefined means default (0.33)
}

export interface CategoryStaticData {
  id: PersonCategory;
  count: number;
  description: string; // Dynamic description based on database (e.g., "John" for husband, "3 Sons" for children)
  backgroundPhotos: BackgroundPhoto[]; // Photos with eye level positioning
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
  getAllFamilies(): Promise<Family[]>;
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
  
  // People management (family-scoped - familyId required for security)
  getAllPeople(familyId: string): Promise<Person[]>;
  getPeopleByCategory(category: PersonCategory, familyId: string): Promise<Person[]>;
  getPersonById(id: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: string, updates: Partial<Person>): Promise<Person | undefined>;
  deletePerson(id: string): Promise<boolean>;
  searchPeople(query: string, familyId: string): Promise<Person[]>;
  recordVisit(id: string, visitDate: string): Promise<Person | undefined>;
  
  // Quiz results (family-scoped - familyId required for security)
  saveQuizResult(result: InsertQuizResult): Promise<QuizResult>;
  getQuizResults(familyId: string): Promise<QuizResult[]>;
  
  // Static data (family-scoped - familyId required for security)
  getStaticHomeData(familyId: string): Promise<StaticHomeData>;
  
  // Analytics
  recordPageView(pageView: InsertPageView): Promise<PageView>;
  getAnalyticsSummary(familyId: string): Promise<AnalyticsSummary>;
  
  // Cache management
  invalidateCache(): Promise<void>;
}

const ALL_CATEGORIES: PersonCategory[] = [
  "husband", "wife", "children", "grandchildren", "partners", 
  "other", "caregivers"
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

  async getAllFamilies(): Promise<Family[]> {
    return await db.select().from(families);
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
      case "partners":
        return `${count} ${count === 1 ? "Partner" : "Partners"}`;
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
      // Include eyeCenterY for proper background positioning
      const backgroundPhotos: BackgroundPhoto[] = peopleWithPhotos
        .map(p => ({
          photo: p.thumbnailData || p.photoData!,
          eyeCenterY: p.eyeCenterY ? parseFloat(p.eyeCenterY) : undefined,
        }))
        .filter((bp): bp is BackgroundPhoto => bp.photo !== null);
      
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

  async getStaticHomeData(familyId: string): Promise<StaticHomeData> {
    // familyId is required for security - no '__all__' fallback
    if (this.staticHomeDataCache.has(familyId)) {
      return this.staticHomeDataCache.get(familyId)!;
    }
    
    const allPeople = await this.loadPeopleCache();
    const filteredPeople = allPeople.filter(p => p.familyId === familyId);
    
    const staticData = this.generateStaticDataForFamily(filteredPeople);
    this.staticHomeDataCache.set(familyId, staticData);
    
    return staticData;
  }

  // ============================================================================
  // PEOPLE CRUD OPERATIONS
  // ============================================================================

  async getAllPeople(familyId: string): Promise<Person[]> {
    // familyId is required for security
    const allPeople = await this.loadPeopleCache();
    return allPeople.filter(p => p.familyId === familyId);
  }

  async getPeopleByCategory(category: PersonCategory, familyId: string): Promise<Person[]> {
    // familyId is required for security
    const allPeople = await this.loadPeopleCache();
    const filtered = allPeople
      .filter(p => p.category === category && p.familyId === familyId);
    
    // Sort grandchildren, children, and partners by age descending (oldest first)
    const ageSortedCategories = ['grandchildren', 'children', 'partners'];
    if (ageSortedCategories.includes(category)) {
      return filtered.sort((a, b) => {
        // Calculate ages from birthdate - older people (earlier birth dates) come first
        const ageA = a.born ? new Date(a.born).getTime() : Infinity;
        const ageB = b.born ? new Date(b.born).getTime() : Infinity;
        // Earlier birth date = older = should come first (ascending by birth date = descending by age)
        return ageA - ageB;
      });
    }
    
    // Default sort by sortOrder for other categories
    return filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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

  async searchPeople(query: string, familyId: string): Promise<Person[]> {
    // familyId is required for security
    const allPeople = await this.loadPeopleCache();
    const searchTerm = query.toLowerCase();
    
    return allPeople.filter(p => 
      p.familyId === familyId &&
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

  async getQuizResults(familyId: string): Promise<QuizResult[]> {
    // familyId is required for security - no global cache fallback
    return db
      .select()
      .from(quizResults)
      .where(eq(quizResults.familyId, familyId))
      .orderBy(desc(quizResults.completedAt));
  }

  // ============================================================================
  // ANALYTICS - Page view tracking
  // ============================================================================

  async recordPageView(pageView: InsertPageView): Promise<PageView> {
    const [created] = await db.insert(pageViews).values(pageView).returning();
    return created;
  }

  async getAnalyticsSummary(familyId: string): Promise<AnalyticsSummary> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Always scope to family for multi-tenant isolation
    const familyCondition = eq(pageViews.familyId, familyId);

    // Get total views
    const [totalResult] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(familyCondition);
    const totalViews = totalResult?.count || 0;

    // Get views last 7 days
    const [last7Result] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(and(familyCondition, gte(pageViews.visitedAt, sevenDaysAgo)));
    const viewsLast7Days = last7Result?.count || 0;

    // Get views last 30 days
    const [last30Result] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(and(familyCondition, gte(pageViews.visitedAt, thirtyDaysAgo)));
    const viewsLast30Days = last30Result?.count || 0;

    // Get daily views for last 30 days
    const dailyViewsRaw = await db
      .select({
        date: sql<string>`DATE(${pageViews.visitedAt})`,
        count: count(),
      })
      .from(pageViews)
      .where(and(familyCondition, gte(pageViews.visitedAt, thirtyDaysAgo)))
      .groupBy(sql`DATE(${pageViews.visitedAt})`)
      .orderBy(sql`DATE(${pageViews.visitedAt})`);

    const dailyViews: DailyPageViews[] = dailyViewsRaw.map(row => ({
      date: row.date,
      count: row.count,
    }));

    // Get top pages (last 30 days)
    const topPagesRaw = await db
      .select({
        route: pageViews.route,
        count: count(),
      })
      .from(pageViews)
      .where(and(familyCondition, gte(pageViews.visitedAt, thirtyDaysAgo)))
      .groupBy(pageViews.route)
      .orderBy(desc(count()))
      .limit(10);

    const topPages: PageViewsByRoute[] = topPagesRaw.map(row => ({
      route: row.route,
      count: row.count,
    }));

    return {
      totalViews,
      viewsLast7Days,
      viewsLast30Days,
      dailyViews,
      topPages,
    };
  }
}

export const storage = new CachedDatabaseStorage();
