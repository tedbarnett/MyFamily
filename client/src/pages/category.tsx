import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
              variant="ghost"
              className="flex-shrink-0 h-auto py-2 px-3 flex flex-col items-center gap-1"
              data-testid="button-back"
            >
              <ArrowLeft className="w-12 h-12" strokeWidth={3} />
              <span className="text-sm font-bold">Back</span>
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
          <div className="grid grid-cols-1 gap-6">
            {people.map((person) => {
              const photoSrc = person.photoData || person.photoUrl;
              return (
                <Link
                  key={person.id}
                  href={`/person/${person.id}`}
                  data-testid={`link-person-${person.id}`}
                >
                  <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all overflow-hidden">
                    <div 
                      className="relative aspect-square w-full"
                      style={{
                        backgroundColor: photoSrc ? undefined : 'hsl(var(--primary) / 0.1)',
                      }}
                    >
                      {photoSrc ? (
                        <img 
                          src={photoSrc} 
                          alt={person.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-8xl font-bold text-primary/40">
                            {getInitials(person.name)}
                          </span>
                        </div>
                      )}
                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Text overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h2 
                          className="text-4xl font-bold text-white mb-1 break-words"
                          style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                          data-testid={`text-person-name-${person.id}`}
                        >
                          {person.name}
                        </h2>
                        <p 
                          className="text-2xl text-white/90 break-words"
                          style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}
                          data-testid={`text-person-relationship-${person.id}`}
                        >
                          {person.relationship}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
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
