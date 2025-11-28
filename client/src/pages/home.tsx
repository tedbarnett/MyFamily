import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Heart, Baby, Stethoscope, Search, X, HeartHandshake, UsersRound, BrainCircuit, Cake } from "lucide-react";
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
    id: "daughters_in_law",
    label: "Daughters in Law",
    description: "4 Daughters in Law",
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
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [, setLocation] = useLocation();

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

  const handleSearch = () => {
    if (searchInput.trim().length > 0) {
      setSubmittedSearch(searchInput.trim());
    }
  };

  const { data: searchResults = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/search", submittedSearch],
    enabled: submittedSearch.length > 0,
  });

  const { data: allPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const getPeopleByCategory = (categoryId: PersonCategory): Person[] => {
    return allPeople.filter((person) => person.category === categoryId);
  };

  const categoryBackgroundPhotos = useMemo(() => {
    const photos: Record<string, string | null> = {};
    categories.forEach((category) => {
      const peopleWithPhotos = allPeople.filter(
        (p) => p.category === category.id && (p.photoData || p.photoUrl)
      );
      if (peopleWithPhotos.length > 0) {
        const randomPerson = peopleWithPhotos[Math.floor(Math.random() * peopleWithPhotos.length)];
        photos[category.id] = randomPerson.photoData || randomPerson.photoUrl || null;
      } else {
        photos[category.id] = null;
      }
    });
    return photos;
  }, [allPeople]);

  const getChildrenLabel = (): string => {
    const children = getPeopleByCategory("children");
    if (children.length === 0) return "Children";
    
    const allSons = children.every(child => 
      child.relationship?.toLowerCase() === "son"
    );
    const allDaughters = children.every(child => 
      child.relationship?.toLowerCase() === "daughter"
    );
    
    if (allSons) return "Sons";
    if (allDaughters) return "Daughters";
    return "Children";
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSubmittedSearch("");
  };

  const handleAdminProceed = () => {
    setShowAdminDialog(false);
    setLocation("/admin");
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
          Today is {formatTodayDate()}
        </h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {!showSearchResults && (
          <div className="grid grid-cols-1 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              const categoryPeople = getPeopleByCategory(category.id);
              const backgroundPhoto = categoryBackgroundPhotos[category.id];
              const linkTarget = categoryPeople.length === 1 
                ? `/person/${categoryPeople[0].id}` 
                : `/category/${category.id}`;
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
                          {category.id === "children" ? getChildrenLabel() : category.label}
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
              href="/birthdays"
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
              href="/everyone"
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
                      {allPeople.length} people
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link
              href="/quiz"
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

            <div className="mt-8 text-center">
              <button
                className="text-xs text-gray-400"
                onClick={() => setShowAdminDialog(true)}
                data-testid="button-admin"
              >
                Admin view
              </button>
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

      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Admin edits?</DialogTitle>
            <DialogDescription className="text-center text-lg">
              This will open the admin page where you can edit people and photos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              onClick={() => setShowAdminDialog(false)}
              className="flex-1 h-14 text-lg"
              data-testid="button-admin-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleAdminProceed}
              className="flex-1 h-14 text-lg"
              data-testid="button-admin-proceed"
            >
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
