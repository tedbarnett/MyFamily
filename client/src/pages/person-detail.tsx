import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Calendar, Briefcase, Heart, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import type { Person, PersonCategory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

const categoryOrder: PersonCategory[] = [
  "husband",
  "children",
  "grandchildren",
  "daughters_in_law",
  "other",
  "caregivers",
];

export default function PersonDetail() {
  const [, params] = useRoute("/person/:id");
  const [, setLocation] = useLocation();
  const personId = params?.id;
  
  // Touch/swipe state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Voice note playback
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Multi-photo state with transition
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [previousPhotoIndex, setPreviousPhotoIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { data: person, isLoading } = useQuery<Person>({
    queryKey: [`/api/person/${personId}`],
    enabled: !!personId,
  });

  // Fetch all people to enable linking children/grandchildren by name
  const { data: allPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Build array of all photos for this person
  const allPhotos = useMemo(() => {
    if (!person) return [];
    const photos: string[] = [];
    // Include primary photo
    if (person.photoData) {
      photos.push(person.photoData);
    } else if (person.photoUrl) {
      photos.push(person.photoUrl);
    }
    // Add any additional photos from the photos array
    if (person.photos && person.photos.length > 0) {
      person.photos.forEach(photo => {
        if (!photos.includes(photo)) {
          photos.push(photo);
        }
      });
    }
    return photos;
  }, [person]);

  // Reset photo index when person changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [personId]);

  // Mutation to set primary photo
  const setPrimaryMutation = useMutation({
    mutationFn: async (photoData: string) => {
      const response = await apiRequest("POST", `/api/person/${personId}/photos/set-primary`, { photoData });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/person/${personId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
    },
  });

  // Handle tapping on photo to cycle through with transition
  const handlePhotoTap = useCallback(() => {
    if (allPhotos.length <= 1 || isTransitioning) return;
    
    // Start transition
    setIsTransitioning(true);
    setPreviousPhotoIndex(currentPhotoIndex);
    
    const nextIndex = (currentPhotoIndex + 1) % allPhotos.length;
    setCurrentPhotoIndex(nextIndex);
    
    // Get the new photo from the stable allPhotos array
    const newPrimaryPhoto = allPhotos[nextIndex];
    if (newPrimaryPhoto && newPrimaryPhoto !== person?.photoData) {
      // Delay mutation slightly to ensure state is updated
      setTimeout(() => {
        setPrimaryMutation.mutate(newPrimaryPhoto);
      }, 0);
    }
    
    // End transition after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
      setPreviousPhotoIndex(null);
    }, 800);
  }, [allPhotos, currentPhotoIndex, isTransitioning, person?.photoData, setPrimaryMutation]);

  // Sort people the same way as the Everyone page
  const sortedPeople = useMemo(() => {
    return [...allPeople].sort((a, b) => {
      const categoryIndexA = categoryOrder.indexOf(a.category as PersonCategory);
      const categoryIndexB = categoryOrder.indexOf(b.category as PersonCategory);
      
      if (categoryIndexA !== categoryIndexB) {
        return categoryIndexA - categoryIndexB;
      }
      
      return a.name.localeCompare(b.name);
    });
  }, [allPeople]);

  // Find current person's index and neighbors
  const currentIndex = useMemo(() => {
    return sortedPeople.findIndex(p => p.id === personId);
  }, [sortedPeople, personId]);

  const prevPerson = currentIndex > 0 ? sortedPeople[currentIndex - 1] : null;
  const nextPerson = currentIndex < sortedPeople.length - 1 ? sortedPeople[currentIndex + 1] : null;

  // Navigate to previous/next person
  const navigateToPrev = useCallback(() => {
    if (prevPerson) {
      setLocation(`/person/${prevPerson.id}`);
    }
  }, [prevPerson, setLocation]);

  const navigateToNext = useCallback(() => {
    if (nextPerson) {
      setLocation(`/person/${nextPerson.id}`);
    }
  }, [nextPerson, setLocation]);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setSwipeOffset(0);
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAnimating || touchStartX.current === null) return;
    touchEndX.current = e.touches[0].clientX;
    const offset = touchEndX.current - touchStartX.current;
    // Limit the offset and add resistance at edges
    const maxOffset = 150;
    const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset));
    // Add resistance if no person in that direction
    const resistedOffset = (offset > 0 && !prevPerson) || (offset < 0 && !nextPerson)
      ? limitedOffset * 0.3
      : limitedOffset;
    setSwipeOffset(resistedOffset);
  }, [isAnimating, prevPerson, nextPerson]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) {
      setSwipeOffset(0);
      return;
    }
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Minimum swipe distance to trigger navigation
    
    if (Math.abs(swipeDistance) >= minSwipeDistance) {
      if (swipeDistance > 0 && nextPerson) {
        // Swiped left -> animate out and go to next person
        setIsAnimating(true);
        setSwipeOffset(-300);
        setTimeout(() => {
          navigateToNext();
          setSwipeOffset(0);
          setIsAnimating(false);
        }, 200);
      } else if (swipeDistance < 0 && prevPerson) {
        // Swiped right -> animate out and go to previous person
        setIsAnimating(true);
        setSwipeOffset(300);
        setTimeout(() => {
          navigateToPrev();
          setSwipeOffset(0);
          setIsAnimating(false);
        }, 200);
      } else {
        // Bounce back
        setSwipeOffset(0);
      }
    } else {
      // Bounce back
      setSwipeOffset(0);
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  }, [navigateToNext, navigateToPrev, nextPerson, prevPerson]);

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

  // Current photo to display (from cycling through all photos)
  const currentPhotoSrc = allPhotos.length > 0 ? allPhotos[currentPhotoIndex] : undefined;

  // Check if this person is the only one in their category
  const peopleInCategory = allPeople.filter(p => p.category === person.category);
  const isOnlyOneInCategory = peopleInCategory.length === 1;
  const backLink = isOnlyOneInCategory ? "/" : `/category/${person.category}`;

  const playVoiceNote = async () => {
    if (person.voiceNoteData && audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error("Error playing voice note:", error);
        setIsPlaying(false);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background pb-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="person-detail-container"
    >
      <Link href={backLink}>
        <header 
          className="bg-card border-b border-card-border px-6 py-6 sticky top-0 z-10 cursor-pointer hover-elevate active-elevate-2"
          data-testid="header-back"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div
              className="flex-shrink-0 flex items-center gap-1 text-primary mt-0.5"
              data-testid="button-back"
            >
              <ArrowLeft className="w-8 h-8" strokeWidth={2.5} />
              <span className="text-sm font-bold">Back</span>
            </div>
            <h1 className="text-3xl font-bold text-muted-foreground/70 flex-1 truncate ml-2">
              Details
            </h1>
          </div>
        </header>
      </Link>

      <div className="relative w-full aspect-square max-w-2xl mx-auto overflow-visible">
        <div 
          className="w-full h-full cursor-pointer overflow-hidden"
          style={{ 
            transform: `translateX(${swipeOffset}px)`,
            transition: isAnimating || swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
          }}
          onClick={handlePhotoTap}
          data-testid="photo-tap-area"
        >
          {/* Previous photo (fading out during transition) */}
          {previousPhotoIndex !== null && allPhotos[previousPhotoIndex] && (
            <img
              src={allPhotos[previousPhotoIndex]}
              alt={person.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transition: 'opacity 0.8s ease-in-out',
                transform: 'scale(1.05)',
              }}
            />
          )}
          
          {/* Current photo with Ken Burns effect */}
          {currentPhotoSrc ? (
            <img
              key={currentPhotoIndex}
              src={currentPhotoSrc}
              alt={person.name}
              className="w-full h-full object-cover"
              style={{
                opacity: isTransitioning ? 1 : 1,
                transition: 'opacity 0.8s ease-in-out, transform 8s ease-out',
                transform: isTransitioning ? 'scale(1.0)' : 'scale(1.08)',
                transformOrigin: currentPhotoIndex % 2 === 0 ? 'center center' : 'top center',
              }}
              data-testid="img-person-photo"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <span className="text-8xl font-bold text-primary">
                {getInitials(person.name)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-center pointer-events-none">
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
            {allPhotos.length > 1 && (
              <div className="flex justify-center gap-2 mt-3" data-testid="photo-indicators">
                {allPhotos.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentPhotoIndex 
                        ? 'bg-white scale-110' 
                        : 'bg-white/50'
                    }`}
                    data-testid={`photo-dot-${index}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {person.voiceNoteData && (
          <>
            <audio 
              ref={audioRef} 
              preload="auto"
              onEnded={() => setIsPlaying(false)}
              onError={(e) => console.error("Audio error:", e)}
            >
              <source src={person.voiceNoteData} type="audio/webm" />
              <source src={person.voiceNoteData} type="audio/wav" />
            </audio>
            <Button
              onClick={playVoiceNote}
              size="icon"
              className={`absolute bottom-2 right-2 h-16 w-16 rounded-full shadow-lg z-50 ${isPlaying ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`}
              data-testid="button-play-voice"
            >
              <Volume2 className="w-8 h-8" />
            </Button>
          </>
        )}
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">

          {person.fullName && person.fullName !== person.name && (
            <Card>
              <div className="p-6">
                <p className="text-2xl font-bold text-foreground text-center" data-testid="text-fullname">
                  {person.fullName}
                </p>
              </div>
            </Card>
          )}

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

          {/* Navigation to previous/next person */}
          <div className="flex gap-4 pt-6 pb-4">
            <Button
              variant="outline"
              className="flex-1 h-20 text-xl flex-col gap-1 px-4"
              onClick={navigateToPrev}
              disabled={!prevPerson}
              data-testid="button-prev-person"
            >
              <div className="flex items-center text-muted-foreground text-sm">
                <ChevronLeft className="w-5 h-5" />
                Previous
              </div>
              <span className="font-bold truncate max-w-full">
                {prevPerson ? prevPerson.name : "—"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-20 text-xl flex-col gap-1 px-4"
              onClick={navigateToNext}
              disabled={!nextPerson}
              data-testid="button-next-person"
            >
              <div className="flex items-center text-muted-foreground text-sm">
                Next
                <ChevronRight className="w-5 h-5" />
              </div>
              <span className="font-bold truncate max-w-full">
                {nextPerson ? nextPerson.name : "—"}
              </span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
