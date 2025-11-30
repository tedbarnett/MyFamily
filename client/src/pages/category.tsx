import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Person, PersonCategory, CategorySettings } from "@shared/schema";
import { useEffect } from "react";
import { useFamilySlug } from "@/lib/use-family-slug";

const categoryLabels: Record<PersonCategory, string> = {
  husband: "Husband",
  wife: "Wife",
  children: "Children",
  grandchildren: "Grandchildren",
  partners: "Partners",
  caregivers: "Caregivers",
  other: "Friends & Neighbors",
};

const validCategories: PersonCategory[] = ["husband", "wife", "children", "grandchildren", "partners", "other", "caregivers"];

export default function Category() {
  const [, routeParams] = useRoute("/category/:category");
  const [, setLocation] = useLocation();
  const { familySlug, isFamilyScoped, tenantUrl } = useFamilySlug();
  const category = routeParams?.category as PersonCategory;

  // Validate category and redirect if invalid
  useEffect(() => {
    if (category && !validCategories.includes(category)) {
      setLocation(tenantUrl("/"));
    }
  }, [category, setLocation, tenantUrl]);

  const { data: people, isLoading } = useQuery<Person[]>({
    queryKey: [`/api/people/${category}`],
  });

  // Fetch category settings for custom labels
  const { data: categorySettings = {} } = useQuery<CategorySettings>({
    queryKey: ["/api/category-settings"],
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Get dynamic label for category - prioritize custom labels
  const getCategoryLabel = (): string => {
    // First check for custom label in settings
    const customLabel = categorySettings[category]?.label;
    if (customLabel) return customLabel;

    // Then check for dynamic children label based on gender
    if (category === "children" && people && people.length > 0) {
      const allSons = people.every(child => 
        child.relationship?.toLowerCase() === "son"
      );
      const allDaughters = people.every(child => 
        child.relationship?.toLowerCase() === "daughter"
      );
      
      if (allSons) return "Sons";
      if (allDaughters) return "Daughters";
    }
    
    return categoryLabels[category] || "Family";
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <Link href={tenantUrl("/")}>
        <header 
          className="bg-card border-b border-card-border px-6 py-6 sticky top-0 z-10 cursor-pointer hover-elevate active-elevate-2"
          data-testid="header-back"
        >
          <div className="max-w-2xl mx-auto relative flex items-center justify-center">
            <div
              className="absolute left-0 flex items-center gap-1 text-primary"
              data-testid="button-back"
            >
              <ArrowLeft className="w-10 h-10" strokeWidth={2.5} />
              <span className="text-sm font-bold">Back</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground text-center">
              {getCategoryLabel()}
            </h1>
          </div>
        </header>
      </Link>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : people && people.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {people.map((person) => {
              const photoSrc = person.photoData;
              return (
                <Link
                  key={person.id}
                  href={tenantUrl(`/person/${person.id}`)}
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
