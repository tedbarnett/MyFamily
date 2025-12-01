import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Heart, Baby, Stethoscope, Search, X, HeartHandshake, UsersRound, BrainCircuit, Cake, Images } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useFamilySlug } from "@/lib/use-family-slug";
import type { PersonCategory, Person, CategorySettings } from "@shared/schema";

interface StaticCategoryData {
  id: PersonCategory;
  count: number;
  description: string;
  backgroundPhotos: string[];
  singlePersonId: string | null;
}

interface StaticHomeData {
  categories: StaticCategoryData[];
  totalPeople: number;
  generatedAt: string;
}

interface CategoryCard {
  id: PersonCategory;
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
}

const categories: CategoryCard[] = [
  {
    id: "husband",
    label: "Husband",
    description: "Neil",
    icon: Heart,
    color: "text-red-600",
  },
  {
    id: "wife",
    label: "Wife",
    description: "",
    icon: Heart,
    color: "text-red-600",
  },
  {
    id: "children",
    label: "Children",
    description: "4 Sons",
    icon: Users,
    color: "text-blue-600",
  },
  {
    id: "grandchildren",
    label: "Grandchildren",
    description: "8 Grandchildren",
    icon: Baby,
    color: "text-purple-600",
  },
  {
    id: "partners",
    label: "Partners",
    description: "",
    icon: HeartHandshake,
    color: "text-pink-600",
  },
  {
    id: "other",
    label: "Friends & Neighbors",
    description: "",
    icon: Users,
    color: "text-gray-600",
  },
  {
    id: "caregivers",
    label: "Caregivers",
    description: "",
    icon: Stethoscope,
    color: "text-orange-600",
  },
];

export default function Home() {
  const { familySlug, isFamilyScoped, tenantUrl } = useFamilySlug();
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const getTodayParts = () => {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return { dayOfWeek, dateStr };
  };

  const handleSearch = () => {
    if (searchInput.trim().length > 0) {
      setSubmittedSearch(searchInput.trim());
    }
  };

  const { data: searchResults = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/search", submittedSearch],
    enabled: submittedSearch.length > 0,
  });

  // Fetch all people for fallback when search finds nothing
  const { data: allPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people-list"],
    enabled: submittedSearch.length > 0 && searchResults.length === 0 && !isLoading,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Use pre-computed static data - cache indefinitely since it only changes on data edits
  const { data: staticData, isPending: isStaticDataLoading } = useQuery<StaticHomeData>({
    queryKey: ["/api/static/home"],
    staleTime: Infinity, // Never consider stale - only refetch on cache invalidation
    gcTime: Infinity, // Keep in cache forever
  });

  // Fetch category settings for custom labels and visibility
  const { data: categorySettings = {} } = useQuery<CategorySettings>({
    queryKey: ["/api/category-settings"],
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Fetch welcome info (senior name and welcome message)
  interface WelcomeInfo {
    seniorName: string | null;
    welcomeMessage: string | null;
  }
  const { data: welcomeInfo } = useQuery<WelcomeInfo>({
    queryKey: ["/api/welcome-info"],
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Fetch birthday data to check for today's birthdays
  interface BirthdayPerson {
    id: string;
    name: string;
    born: string;
  }
  const { data: birthdayPeople = [] } = useQuery<BirthdayPerson[]>({
    queryKey: ["/api/birthdays"],
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Find people with birthdays today
  const todaysBirthdays = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    return birthdayPeople.filter(person => {
      if (!person.born) return false;
      const birthDate = new Date(person.born);
      return birthDate.getMonth() === todayMonth && birthDate.getDate() === todayDay;
    }).map(person => {
      const birthDate = new Date(person.born);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      // Adjust if birthday hasn't occurred yet this year
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return { name: person.name, age };
    });
  }, [birthdayPeople]);

  // Format age with proper suffix (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinalSuffix = (n: number): string => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Get custom label for a category (or default if not customized)
  const getCategoryLabel = (categoryId: PersonCategory, defaultLabel: string): string => {
    return categorySettings[categoryId]?.label || defaultLabel;
  };

  // Check if a category is hidden
  const isCategoryHidden = (categoryId: PersonCategory): boolean => {
    return categorySettings[categoryId]?.hidden || false;
  };

  // Helper to get category data from static cache
  const getCategoryData = (categoryId: PersonCategory): StaticCategoryData | undefined => {
    return staticData?.categories.find(c => c.id === categoryId);
  };

  // Generate random photo selections that persist until page refresh
  // Uses useMemo with empty deps to only compute once per component mount
  const randomPhotoSelections = useMemo(() => {
    const selections: Record<string, number> = {};
    categories.forEach(cat => {
      selections[cat.id] = Math.random();
    });
    return selections;
  }, []);

  // Pick a random photo from the available photos for a category
  const getRandomPhoto = (categoryId: PersonCategory): string | null => {
    const categoryData = getCategoryData(categoryId);
    if (!categoryData || categoryData.backgroundPhotos.length === 0) return null;
    
    const randomValue = randomPhotoSelections[categoryId] || 0;
    const index = Math.floor(randomValue * categoryData.backgroundPhotos.length);
    return categoryData.backgroundPhotos[index];
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSubmittedSearch("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const showSearchResults = submittedSearch.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-card-border px-6 py-6">
        <h1 className="text-3xl font-bold text-center text-foreground" data-testid="text-today-date">
          Today is {getTodayParts().dayOfWeek}
          <br />
          {getTodayParts().dateStr}
        </h1>
        {todaysBirthdays.length > 0 && (
          <div className="text-center mt-2">
            {todaysBirthdays.map((birthday, index) => (
              <p key={index} className="text-3xl font-bold text-red-600" data-testid={`text-birthday-${index}`}>
                {birthday.name}'s {getOrdinalSuffix(birthday.age)} birthday!
              </p>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {!showSearchResults && (
          <div className="grid grid-cols-1 gap-6">
            {/* Show skeleton cards while loading */}
            {isStaticDataLoading && (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={`skeleton-${i}`} className="relative overflow-hidden">
                    <div className="p-6 flex items-center gap-4">
                      <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
            
            {/* Show actual category cards once loaded */}
            {!isStaticDataLoading && categories
              .filter((category) => {
                const categoryData = getCategoryData(category.id);
                // Hide categories with no people or that are marked as hidden
                return categoryData && categoryData.count > 0 && !isCategoryHidden(category.id);
              })
              .map((category) => {
              const Icon = category.icon;
              const categoryData = getCategoryData(category.id);
              const backgroundPhoto = getRandomPhoto(category.id);
              const linkTarget = categoryData?.singlePersonId 
                ? tenantUrl(`/person/${categoryData.singlePersonId}`)
                : tenantUrl(`/category/${category.id}`);
              return (
                <Link
                  key={category.id}
                  href={linkTarget}
                  data-testid={`link-category-${category.id}`}
                >
                  <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all relative overflow-hidden">
                    {/* Faint full-width background photo */}
                    {backgroundPhoto && (
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-75"
                        style={{ 
                          backgroundImage: `url(${backgroundPhoto})`,
                        }}
                      />
                    )}
                    {/* Light overlay for text readability */}
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/40" />
                    <div className="p-6 flex items-center gap-4 relative z-10">
                      <div className="text-foreground/80 flex-shrink-0">
                        <Icon className="w-14 h-14" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-foreground mb-1">
                          {getCategoryLabel(category.id, category.label)}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                          {categoryData?.description || category.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}

            <Link
              href={tenantUrl("/everyone")}
              data-testid="link-everyone"
            >
              <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all bg-muted/70 dark:bg-muted/50">
                <div className="p-6 flex items-center gap-4">
                  <div className="text-primary flex-shrink-0">
                    <UsersRound className="w-14 h-14" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      Everyone
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {staticData?.totalPeople ? `${staticData.totalPeople} people` : "View all"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link
              href={tenantUrl("/birthdays")}
              data-testid="link-birthdays"
            >
              <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all">
                <div className="p-6 flex items-center gap-4">
                  <div className="text-pink-600 flex-shrink-0">
                    <Cake className="w-14 h-14" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      Birthdays
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Upcoming celebrations
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link
              href={tenantUrl("/quiz")}
              data-testid="link-quiz"
            >
              <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all bg-primary/5 border-primary/20">
                <div className="p-6 flex items-center gap-4">
                  <div className="text-primary flex-shrink-0">
                    <BrainCircuit className="w-14 h-14" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      Memory Quiz
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Practice remembering names
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link
              href={tenantUrl("/photo-album")}
              data-testid="link-photo-album"
            >
              <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all bg-primary/5 border-primary/20">
                <div className="p-6 flex items-center gap-4">
                  <div className="text-primary flex-shrink-0">
                    <Images className="w-14 h-14" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      Photo Album
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {staticData?.totalPeople ? `${staticData.totalPeople} people` : "View all"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <div className="mt-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Type a name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-16 pr-16 text-3xl font-bold h-20 placeholder:text-2xl placeholder:font-normal"
                  data-testid="input-search"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12"
                    data-testid="button-clear-input"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSearch}
                disabled={searchInput.trim().length === 0}
                className="w-full h-16 text-2xl font-bold"
                data-testid="button-search"
              >
                <Search className="w-8 h-8 mr-3" />
                Search
              </Button>
            </div>

            {/* Welcome message at the bottom - only shown if set */}
            {welcomeInfo?.welcomeMessage && (
              <div className="mt-8 text-center" data-testid="welcome-message-section">
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ 
                    __html: welcomeInfo.welcomeMessage
                      .replace(/\n/g, '<br />')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>')
                  }}
                />
              </div>
            )}

          </div>
        )}

        {showSearchResults && (
          <div className="mt-6" data-testid="search-results">
            {isLoading ? (
              <div className="text-center text-xl text-muted-foreground py-8">
                Searching...
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.length === 0 ? (
                  <p className="text-xl text-muted-foreground mb-4" data-testid="text-search-fallback">
                    Maybe one of these...
                  </p>
                ) : (
                  <p className="text-lg text-muted-foreground mb-4">
                    Found {searchResults.length} {searchResults.length === 1 ? "person" : "people"}
                  </p>
                )}
                {(searchResults.length > 0 ? searchResults : allPeople).map((person) => (
                  <Link
                    key={person.id}
                    href={tenantUrl(`/person/${person.id}`)}
                    data-testid={`link-person-${person.id}`}
                  >
                    <Card className="hover-elevate active-elevate-2 cursor-pointer">
                      <div className="p-6 flex items-center gap-6">
                        <Avatar className="w-20 h-20 flex-shrink-0">
                          {person.photoData && (
                            <AvatarImage src={person.photoData} alt={person.name} />
                          )}
                          <AvatarFallback className="text-2xl">
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl font-bold text-foreground mb-1">
                            {person.name}
                          </h3>
                          <p className="text-xl text-muted-foreground">
                            {person.relationship}
                          </p>
                          {person.location && (
                            <p className="text-lg text-muted-foreground mt-1">
                              {person.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
                <Button
                  variant="secondary"
                  onClick={handleClearSearch}
                  className="w-full h-14 text-xl mt-4"
                  data-testid="button-clear-search-bottom"
                >
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
