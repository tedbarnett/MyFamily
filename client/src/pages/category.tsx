import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Person, PersonCategory } from "@shared/schema";
import { useEffect } from "react";

const categoryLabels: Record<PersonCategory, string> = {
  husband: "Husband",
  children: "Children",
  grandchildren: "Grandchildren",
  friends: "Friends",
  caregivers: "Caregivers",
};

const validCategories: PersonCategory[] = ["husband", "children", "grandchildren", "friends", "caregivers"];

export default function Category() {
  const [, params] = useRoute("/category/:category");
  const [, setLocation] = useLocation();
  const category = params?.category as PersonCategory;

  // Validate category and redirect if invalid
  useEffect(() => {
    if (category && !validCategories.includes(category)) {
      setLocation("/");
    }
  }, [category, setLocation]);

  const { data: people, isLoading } = useQuery<Person[]>({
    queryKey: [`/api/people/${category}`],
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-card-border px-6 py-6 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0 h-12 w-12"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex-1">
            {categoryLabels[category] || "Family"}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : people && people.length > 0 ? (
          <div className="space-y-6">
            {people.map((person) => (
              <Link
                key={person.id}
                href={`/person/${person.id}`}
                data-testid={`link-person-${person.id}`}
              >
                <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all">
                  <div className="p-6 flex items-center gap-6">
                    <Avatar className="w-32 h-32 flex-shrink-0 border-2 border-border">
                      <AvatarImage src={person.photoData || person.photoUrl || undefined} alt={person.name} />
                      <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-3xl font-bold text-foreground mb-1 break-words">
                        {person.name}
                      </h2>
                      <p className="text-xl text-muted-foreground break-words">
                        {person.relationship}
                      </p>
                      {person.location && (
                        <p className="text-lg text-muted-foreground mt-1 break-words">
                          {person.location}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground">No people found</p>
          </div>
        )}
      </main>
    </div>
  );
}
