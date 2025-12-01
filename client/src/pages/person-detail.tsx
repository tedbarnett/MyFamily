import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, MapPin, Calendar, Briefcase, ChevronLeft, ChevronRight, Volume2, User, Users, MessageSquare, Mail } from "lucide-react";
import type { Person, PersonCategory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFamilySlug } from "@/lib/use-family-slug";

const categoryOrder: PersonCategory[] = [
  "husband",
  "children",
  "grandchildren",
  "partners",
  "other",
  "caregivers",
];

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { 
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  });
}

function computeAge(born: string | null | undefined): number | null {
  if (!born) return null;
  const birthDate = new Date(born);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

export default function PersonDetail() {
  const [, routeParams] = useRoute("/person/:id");
  const [, setLocation] = useLocation();
  const { familySlug, isFamilyScoped, tenantUrl } = useFamilySlug();
  const personId = routeParams?.id;
  
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

  // Fetch lightweight navigation data (just id, name, category - fast)
  type NavPerson = { id: string; name: string; category: string };
  const { data: navPeople = [] } = useQuery<NavPerson[]>({
    queryKey: ["/api/people-nav"],
  });

  // Fetch all people for linking children/grandchildren by name (can load slower)
  const { data: allPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Fetch senior name for email subject
  type WelcomeInfo = { seniorName: string | null; welcomeMessage: string | null };
  const { data: welcomeInfo } = useQuery<WelcomeInfo>({
    queryKey: ["/api/welcome-info"],
  });
  const seniorName = welcomeInfo?.seniorName || "Mom";

  // Build array of all photos for this person
  const allPhotos = useMemo(() => {
    if (!person) return [];
    const photos: string[] = [];
    // Include primary photo
    if (person.photoData) {
      photos.push(person.photoData);
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

  // Find linked grandchildren for people in the "children" category
  const linkedGrandchildren = useMemo(() => {
    if (!person || person.category !== "children") return [];
    return allPeople.filter(
      p => p.category === "grandchildren" && p.parentIds?.includes(person.id)
    );
  }, [person, allPeople]);

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

  // Sort people for navigation (using lightweight data)
  const sortedNavPeople = useMemo(() => {
    return [...navPeople].sort((a, b) => {
      const categoryIndexA = categoryOrder.indexOf(a.category as PersonCategory);
      const categoryIndexB = categoryOrder.indexOf(b.category as PersonCategory);
      
      if (categoryIndexA !== categoryIndexB) {
        return categoryIndexA - categoryIndexB;
      }
      
      return a.name.localeCompare(b.name);
    });
  }, [navPeople]);

  // Find current person's index and neighbors (using fast nav data)
  const currentIndex = useMemo(() => {
    return sortedNavPeople.findIndex(p => p.id === personId);
  }, [sortedNavPeople, personId]);

  // Wrap around navigation - first person's previous is last person, and vice versa
  const prevPerson = sortedNavPeople.length > 0 && currentIndex >= 0
    ? sortedNavPeople[(currentIndex - 1 + sortedNavPeople.length) % sortedNavPeople.length] 
    : null;
  const nextPerson = sortedNavPeople.length > 0 && currentIndex >= 0
    ? sortedNavPeople[(currentIndex + 1) % sortedNavPeople.length] 
    : null;

  // Navigate to previous/next person
  const navigateToPrev = useCallback(() => {
    if (prevPerson) {
      setLocation(tenantUrl(`/person/${prevPerson.id}`));
    }
  }, [prevPerson, setLocation, tenantUrl]);

  const navigateToNext = useCallback(() => {
    if (nextPerson) {
      setLocation(tenantUrl(`/person/${nextPerson.id}`));
    }
  }, [nextPerson, setLocation, tenantUrl]);

  // Swipe gesture handlers for cycling through photos
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating || isTransitioning) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setSwipeOffset(0);
  }, [isAnimating, isTransitioning]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAnimating || isTransitioning || touchStartX.current === null) return;
    // Only allow swiping if there are multiple photos
    if (allPhotos.length <= 1) return;
    
    touchEndX.current = e.touches[0].clientX;
    const offset = touchEndX.current - touchStartX.current;
    // Limit the offset
    const maxOffset = 150;
    const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset));
    setSwipeOffset(limitedOffset);
  }, [isAnimating, isTransitioning, allPhotos.length]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) {
      setSwipeOffset(0);
      return;
    }
    
    // Only handle swipe if there are multiple photos
    if (allPhotos.length <= 1) {
      setSwipeOffset(0);
      touchStartX.current = null;
      touchEndX.current = null;
      return;
    }
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Minimum swipe distance to trigger photo change
    
    if (Math.abs(swipeDistance) >= minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swiped left -> go to next photo
        setIsAnimating(true);
        setSwipeOffset(-300);
        setTimeout(() => {
          // Go to next photo (with wrap around)
          const nextIndex = (currentPhotoIndex + 1) % allPhotos.length;
          setIsTransitioning(true);
          setPreviousPhotoIndex(currentPhotoIndex);
          setCurrentPhotoIndex(nextIndex);
          
          // Set as primary photo
          const newPrimaryPhoto = allPhotos[nextIndex];
          if (newPrimaryPhoto && newPrimaryPhoto !== person?.photoData) {
            setPrimaryMutation.mutate(newPrimaryPhoto);
          }
          
          setSwipeOffset(0);
          setIsAnimating(false);
          
          setTimeout(() => {
            setIsTransitioning(false);
            setPreviousPhotoIndex(null);
          }, 800);
        }, 200);
      } else if (swipeDistance < 0) {
        // Swiped right -> go to previous photo
        setIsAnimating(true);
        setSwipeOffset(300);
        setTimeout(() => {
          // Go to previous photo (with wrap around)
          const prevIndex = (currentPhotoIndex - 1 + allPhotos.length) % allPhotos.length;
          setIsTransitioning(true);
          setPreviousPhotoIndex(currentPhotoIndex);
          setCurrentPhotoIndex(prevIndex);
          
          // Set as primary photo
          const newPrimaryPhoto = allPhotos[prevIndex];
          if (newPrimaryPhoto && newPrimaryPhoto !== person?.photoData) {
            setPrimaryMutation.mutate(newPrimaryPhoto);
          }
          
          setSwipeOffset(0);
          setIsAnimating(false);
          
          setTimeout(() => {
            setIsTransitioning(false);
            setPreviousPhotoIndex(null);
          }, 800);
        }, 200);
      }
    } else {
      // Bounce back
      setSwipeOffset(0);
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  }, [allPhotos, currentPhotoIndex, person?.photoData, setPrimaryMutation]);

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
  const backLink = isOnlyOneInCategory ? tenantUrl("/") : tenantUrl(`/category/${person.category}`);

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
              className="text-4xl font-bold text-white mb-1"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              data-testid="text-person-name"
            >
              {person.name}
            </h2>
            {person.fullName && (
              <p 
                className="text-lg text-white/80 mb-1"
                style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}
                data-testid="text-person-full-name"
              >
                {person.fullName}
              </p>
            )}
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
              src={person.voiceNoteData}
              preload="metadata"
              onEnded={() => setIsPlaying(false)}
              onError={(e) => console.error("Audio error:", e)}
            />
            <Button
              onClick={playVoiceNote}
              size="icon"
              className={`h-16 w-16 rounded-full shadow-lg z-50 ${isPlaying ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`}
              style={{ position: 'absolute', bottom: '8px', right: '8px' }}
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
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <User className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Full Name
                    </h3>
                    <p className="text-lg text-foreground" data-testid="text-full-name">
                      {person.fullName}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {(computeAge(person.born) || person.born) && (
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Calendar className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Age & Birthday
                    </h3>
                    {computeAge(person.born) && (
                      <p className="text-lg text-foreground mb-1">
                        <span className="font-medium">Age:</span> {computeAge(person.born)}
                      </p>
                    )}
                    {person.born && (
                      <p className="text-lg text-foreground">
                        <span className="font-medium">Born:</span> {formatDate(person.born)}
                      </p>
                    )}
                    {person.passed && (
                      <p className="text-lg text-muted-foreground mt-2">
                        Passed: {formatDate(person.passed)}
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

          {/* Linked grandchildren for people in the children category */}
          {linkedGrandchildren.length > 0 && (
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Users className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {person.name}'s Children
                    </h3>
                    <div className="space-y-3">
                      {linkedGrandchildren.map((grandchild) => (
                        <Link
                          key={grandchild.id}
                          href={tenantUrl(`/person/${grandchild.id}`)}
                          data-testid={`link-grandchild-${grandchild.id}`}
                        >
                          <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer">
                            <Avatar className="w-14 h-14 flex-shrink-0">
                              {grandchild.photoData && (
                                <AvatarImage src={grandchild.photoData} alt={grandchild.name} />
                              )}
                              <AvatarFallback className="text-lg">
                                {getInitials(grandchild.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-lg font-semibold text-foreground">
                                {grandchild.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {grandchild.relationship}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Contact actions - Text and Email */}
          {(person.phone || person.email) && (
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-4">
                  {person.phone && (
                    <a 
                      href={`sms:${person.phone}`}
                      className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                      data-testid="link-text-person"
                    >
                      <MessageSquare className="w-8 h-8 text-primary flex-shrink-0" />
                      <span className="text-xl font-semibold text-primary">
                        Text {person.name}
                      </span>
                    </a>
                  )}
                  {person.email && (
                    <a 
                      href={`mailto:${person.email}?subject=${encodeURIComponent(`Hello from ${seniorName}`)}`}
                      className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                      data-testid="link-email-person"
                    >
                      <Mail className="w-8 h-8 text-primary flex-shrink-0" />
                      <span className="text-xl font-semibold text-primary">
                        Email {person.name}
                      </span>
                    </a>
                  )}
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
