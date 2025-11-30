import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Heart, Baby, Stethoscope, Search, X, HeartHandshake, UsersRound, BrainCircuit, Cake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useFamilySlug } from "@/lib/use-family-slug";
import type { PersonCategory, Person } from "@shared/schema";

interface StaticCategoryData {
  id: PersonCategory;
  count: number;
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
    id: "daughters_in_law",
    label: "Daughters in Law",
    description: "4 Daughters in Law",
    icon: HeartHandshake,
    color: "text-pink-600",
  },
  {
    id: "sons_in_law",
    label: "Sons in Law",
    description: "",
    icon: HeartHandshake,
    color: "text-cyan-600",
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

  // Use pre-computed static data - cache indefinitely since it only changes on data edits
  const { data: staticData } = useQuery<StaticHomeData>({
    queryKey: ["/api/static/home"],
    staleTime: Infinity, // Never consider stale - only refetch on cache invalidation
    gcTime: Infinity, // Keep in cache forever
  });

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
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {!showSearchResults && (
          <div className="grid grid-cols-1 gap-6">
            {categories.map((category) => {
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
                    {backgroundPhoto && (
                      <div 
                        className="absolute inset-0 bg-cover opacity-30"
                        style={{ 
                          backgroundImage: `url(${backgroundPhoto})`,
                          backgroundPosition: 'center'
                        }}
                      />
                    )}
                    <div className="p-6 flex items-center gap-4 relative z-10">
                      <div className={`${category.color} flex-shrink-0`}>
                        <Icon className="w-14 h-14" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-foreground mb-1">
                          {category.label}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}

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

          </div>
        )}

        {showSearchResults && (
          <div className="mt-6" data-testid="search-results">
            {isLoading ? (
              <div className="text-center text-xl text-muted-foreground py-8">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center text-xl text-muted-foreground py-8">
                No one found matching "{submittedSearch}"
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground mb-4">
                  Found {searchResults.length} {searchResults.length === 1 ? "person" : "people"}
                </p>
                {searchResults.map((person) => (
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
