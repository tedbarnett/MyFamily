import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Heart, Baby, UserCircle, Stethoscope, Search, X, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PersonCategory, Person } from "@shared/schema";

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
    id: "friends",
    label: "Friends",
    description: "2 Friends",
    icon: UserCircle,
    color: "text-green-600",
  },
  {
    id: "caregivers",
    label: "Caregivers",
    description: "6 Caregivers",
    icon: Stethoscope,
    color: "text-orange-600",
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const formatTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString("en-US", options);
  };

  const { data: searchResults = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/search", searchQuery],
    enabled: searchQuery.trim().length > 0,
  });

  // Fetch all people to display photos in category cards
  const { data: allPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Group people by category for photo display
  const getPeopleByCategory = (categoryId: PersonCategory): Person[] => {
    return allPeople.filter((person) => person.category === categoryId);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Date Reminder Banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-6 py-4">
        <div className="flex items-center justify-center gap-3">
          <Calendar className="w-7 h-7 text-primary flex-shrink-0" />
          <p className="text-xl font-medium text-foreground" data-testid="text-today-date">
            Today is {formatTodayDate()}
          </p>
        </div>
      </div>

      <header className="bg-card border-b border-card-border px-6 py-6">
        <h1 className="text-4xl font-bold text-center text-foreground">
          Judy's Family
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for someone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 pr-14 text-xl h-16"
              data-testid="input-search"
            />
            {searchQuery && (
              <Button
                variant="secondary"
                size="icon"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12"
                data-testid="button-clear-search"
              >
                <X className="w-8 h-8" />
              </Button>
            )}
          </div>

          {/* Search Results */}
          {showSearchResults && (
            <div className="mt-6" data-testid="search-results">
              {isLoading ? (
                <div className="text-center text-xl text-muted-foreground py-8">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center text-xl text-muted-foreground py-8">
                  No one found matching "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground mb-4">
                    Found {searchResults.length} {searchResults.length === 1 ? "person" : "people"}
                  </p>
                  {searchResults.map((person) => (
                    <Link
                      key={person.id}
                      href={`/person/${person.id}`}
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category Grid - Hide when searching */}
        {!showSearchResults && (
          <div className="grid grid-cols-1 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              const categoryPeople = getPeopleByCategory(category.id);
              return (
                <Link
                  key={category.id}
                  href={`/category/${category.id}`}
                  data-testid={`link-category-${category.id}`}
                >
                  <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all">
                    <div className="p-6 flex items-center gap-4">
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
                      {/* Photo Collage */}
                      {categoryPeople.length > 0 && (
                        <div className="flex -space-x-6 flex-shrink-0">
                          {categoryPeople.slice(0, 4).map((person, index) => (
                            <Avatar
                              key={person.id}
                              className="w-20 h-20 border-2 border-card"
                              style={{ zIndex: categoryPeople.length - index }}
                              data-testid={`avatar-category-${category.id}-${person.id}`}
                            >
                              {(person.photoData || person.photoUrl) && (
                                <AvatarImage
                                  src={person.photoData || person.photoUrl || undefined}
                                  alt={person.name}
                                />
                              )}
                              <AvatarFallback className="text-xl bg-muted">
                                {getInitials(person.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {categoryPeople.length > 4 && (
                            <div
                              className="w-20 h-20 rounded-full bg-muted border-2 border-card flex items-center justify-center text-lg font-medium text-muted-foreground"
                              style={{ zIndex: 0 }}
                            >
                              +{categoryPeople.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
