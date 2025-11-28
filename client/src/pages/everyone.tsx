import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Person, PersonCategory } from "@shared/schema";

const categoryOrder: PersonCategory[] = [
  "husband",
  "children", 
  "grandchildren",
  "daughters_in_law",
  "other",
  "caregivers",
];

export default function Everyone() {
  const { data: allPeople = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const sortedPeople = [...allPeople].sort((a, b) => {
    const categoryIndexA = categoryOrder.indexOf(a.category as PersonCategory);
    const categoryIndexB = categoryOrder.indexOf(b.category as PersonCategory);
    
    if (categoryIndexA !== categoryIndexB) {
      return categoryIndexA - categoryIndexB;
    }
    
    return a.name.localeCompare(b.name);
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
      <Link href="/">
        <header 
          className="bg-card border-b border-card-border px-6 py-6 sticky top-0 z-10 cursor-pointer hover-elevate active-elevate-2"
          data-testid="header-back"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div
              className="flex-shrink-0 h-auto py-3 px-4 flex flex-col items-center gap-1 text-primary"
              data-testid="button-back"
            >
              <ArrowLeft className="w-16 h-16" strokeWidth={3} />
              <span className="text-lg font-bold">Back</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground flex-1 ml-2">
              Everyone
            </h1>
          </div>
        </header>
      </Link>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : sortedPeople.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {sortedPeople.map((person) => {
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
                          <span className="text-5xl font-bold text-primary/40">
                            {getInitials(person.name)}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                        <h2 
                          className="text-xl font-bold text-white mb-0.5 break-words leading-tight"
                          style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                          data-testid={`text-person-name-${person.id}`}
                        >
                          {person.name}
                        </h2>
                        <p 
                          className="text-sm text-white/90"
                          style={{ 
                            textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                            textWrap: 'balance'
                          }}
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
