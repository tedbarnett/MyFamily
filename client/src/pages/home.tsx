import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Heart, Baby, UserCircle, Stethoscope, Search, X } from "lucide-react";
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

  const { data: searchResults = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/search", searchQuery],
    enabled: searchQuery.trim().length > 0,
  });

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
      <header className="bg-card border-b border-card-border px-6 py-8">
        <h1 className="text-4xl font-bold text-center text-foreground">
          Judy's Family
        </h1>
        <p className="text-xl text-center text-muted-foreground mt-2">
          Tap to see your family and friends
        </p>
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
                variant="ghost"
                size="icon"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                data-testid="button-clear-search"
              >
                <X className="w-6 h-6" />
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
              return (
                <Link
                  key={category.id}
                  href={`/category/${category.id}`}
                  data-testid={`link-category-${category.id}`}
                >
                  <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all">
                    <div className="p-8 flex items-center gap-6">
                      <div className={`${category.color} flex-shrink-0`}>
                        <Icon className="w-16 h-16" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-bold text-foreground mb-1">
                          {category.label}
                        </h2>
                        <p className="text-xl text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
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
