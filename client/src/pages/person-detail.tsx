import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Calendar, Briefcase, Heart } from "lucide-react";
import type { Person } from "@shared/schema";

export default function PersonDetail() {
  const [, params] = useRoute("/person/:id");
  const personId = params?.id;

  const { data: person, isLoading } = useQuery<Person>({
    queryKey: [`/api/person/${personId}`],
    enabled: !!personId,
  });

  // Fetch all people to enable linking children/grandchildren by name
  const { data: allPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Helper function to find a person by name and return their ID
  // Supports exact match, first name match, or partial match
  const findPersonByName = (name: string): string | null => {
    const searchName = name.toLowerCase().trim();
    
    // First try exact match
    let found = allPeople.find(
      (p) => p.name.toLowerCase() === searchName
    );
    
    // If no exact match, try matching first name
    if (!found) {
      found = allPeople.find(
        (p) => p.name.toLowerCase().startsWith(searchName + " ")
      );
    }
    
    // If still no match, try partial match (name contains search term)
    if (!found) {
      found = allPeople.find(
        (p) => p.name.toLowerCase().includes(searchName)
      );
    }
    
    return found?.id || null;
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-2xl text-muted-foreground">Person not found</p>
      </div>
    );
  }

  const photoSrc = person.photoData || person.photoUrl || undefined;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-card border-b border-card-border px-6 py-6 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              className="flex-shrink-0 h-auto py-2 px-3 flex flex-col items-center gap-1 text-primary"
              data-testid="button-back"
            >
              <ArrowLeft className="w-12 h-12" strokeWidth={3} />
              <span className="text-sm font-bold">Back</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex-1 truncate">
            Family Details
          </h1>
        </div>
      </header>

      <div className="relative w-full aspect-square max-w-2xl mx-auto">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={person.name}
            className="w-full h-full object-cover"
            data-testid="img-person-photo"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <span className="text-8xl font-bold text-primary">
              {getInitials(person.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
          <h2 
            className="text-4xl font-bold text-white mb-2"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            data-testid="text-person-name"
          >
            {person.name}
          </h2>
          <p 
            className="text-2xl text-white/90"
            style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}
            data-testid="text-person-relationship"
          >
            {person.relationship}
          </p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">

          {(person.age || person.born) && (
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Calendar className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Age & Birthday
                    </h3>
                    {person.age && (
                      <p className="text-lg text-foreground mb-1">
                        <span className="font-medium">Age:</span> {person.age}
                      </p>
                    )}
                    {person.born && (
                      <p className="text-lg text-foreground">
                        <span className="font-medium">Born:</span> {person.born}
                      </p>
                    )}
                    {person.passed && (
                      <p className="text-lg text-muted-foreground mt-2">
                        Passed: {person.passed}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {person.location && (
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <MapPin className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Location
                    </h3>
                    <p className="text-lg text-foreground break-words">
                      {person.location}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {(person.spouse || person.children) && (
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Heart className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Family
                    </h3>
                    {person.spouse && (
                      <p className="text-lg text-foreground mb-2 break-words">
                        <span className="font-medium">Spouse:</span>{" "}
                        {(() => {
                          const spouseId = findPersonByName(person.spouse);
                          return spouseId ? (
                            <Link
                              href={`/person/${spouseId}`}
                              className="text-primary underline font-medium hover:text-primary/80"
                              data-testid="link-spouse"
                            >
                              {person.spouse}
                            </Link>
                          ) : (
                            person.spouse
                          );
                        })()}
                      </p>
                    )}
                    {person.children && person.children.length > 0 && (
                      <div>
                        <p className="text-lg font-medium text-foreground mb-1">
                          Children:
                        </p>
                        <ul className="list-disc list-inside space-y-2">
                          {person.children.map((child, index) => {
                            const childId = findPersonByName(child);
                            return (
                              <li key={index} className="text-lg break-words">
                                {childId ? (
                                  <Link
                                    href={`/person/${childId}`}
                                    className="text-primary underline font-medium hover:text-primary/80"
                                    data-testid={`link-child-${index}`}
                                  >
                                    {child}
                                  </Link>
                                ) : (
                                  <span className="text-foreground">{child}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {person.summary && (
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Briefcase className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      About
                    </h3>
                    <p className="text-lg text-foreground break-words leading-relaxed">
                      {person.summary}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
