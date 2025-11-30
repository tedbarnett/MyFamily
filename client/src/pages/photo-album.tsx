import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useFamilySlug } from "@/lib/use-family-slug";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { Person } from "@shared/schema";

export default function PhotoAlbum() {
  const { tenantUrl } = useFamilySlug();
  const [, setLocation] = useLocation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const homePath = tenantUrl("/").replace(/\/$/, "") || "/";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b border-card-border px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(homePath)}
              className="flex-shrink-0"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Photo Album</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-xl text-muted-foreground">Loading photos...</p>
        </main>
      </div>
    );
  }

  const peopleWithPhotos = people.filter((p) => p.photoData);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-card-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(homePath)}
            className="flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Photo Album</h1>
            {count > 0 && (
              <p className="text-muted-foreground">
                {current} of {count}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {peopleWithPhotos.length === 0 ? (
          <p className="text-xl text-muted-foreground">No photos available</p>
        ) : (
          <div className="w-full max-w-lg">
            <Carousel
              setApi={setApi}
              className="w-full"
              opts={{
                align: "center",
                loop: true,
              }}
            >
              <CarouselContent>
                {peopleWithPhotos.map((person) => (
                  <CarouselItem key={person.id}>
                    <Card className="overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={person.photoData!}
                          alt={person.name}
                          className="w-full h-full object-cover"
                          data-testid={`img-person-${person.id}`}
                        />
                      </div>
                      <div className="p-6 text-center bg-card">
                        <h2
                          className="text-3xl font-bold text-foreground mb-2"
                          data-testid={`text-name-${person.id}`}
                        >
                          {person.name}
                        </h2>
                        <p
                          className="text-xl text-muted-foreground"
                          data-testid={`text-relationship-${person.id}`}
                        >
                          {person.relationship}
                        </p>
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>

              <div className="flex items-center justify-center gap-4 mt-6">
                <CarouselPrevious
                  className="static translate-y-0 h-14 w-14"
                  data-testid="button-prev"
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    const currentPerson = peopleWithPhotos[current - 1];
                    if (currentPerson) {
                      setLocation(tenantUrl(`/person/${currentPerson.id}`));
                    }
                  }}
                  className="text-xl text-muted-foreground min-w-[80px] h-14 px-4"
                  data-testid="button-view-person"
                >
                  {current} / {count}
                </Button>
                <CarouselNext
                  className="static translate-y-0 h-14 w-14"
                  data-testid="button-next"
                />
              </div>
            </Carousel>

            <p className="text-center text-muted-foreground mt-6 text-lg">
              Swipe left or right to see more photos
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
