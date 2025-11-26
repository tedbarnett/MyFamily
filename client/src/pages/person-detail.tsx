import { useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Calendar, Briefcase, Heart, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PhotoCropper } from "@/components/photo-cropper";
import type { Person } from "@shared/schema";

export default function PersonDetail() {
  const [, params] = useRoute("/person/:id");
  const personId = params?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const { data: person, isLoading } = useQuery<Person>({
    queryKey: [`/api/person/${personId}`],
    enabled: !!personId,
  });

  const photoMutation = useMutation({
    mutationFn: async (photoData: string) => {
      const response = await apiRequest(
        "POST",
        `/api/person/${personId}/photo`,
        { photoData }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/person/${personId}`] });
      toast({
        title: "Photo Updated",
        description: "The photo has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 15MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setCropperImage(base64);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    
    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  const handleCropperClose = () => {
    setShowCropper(false);
    setCropperImage(null);
  };

  const handleCropperSave = (croppedImage: string) => {
    photoMutation.mutate(croppedImage);
    setShowCropper(false);
    setCropperImage(null);
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
              size="icon"
              variant="ghost"
              className="flex-shrink-0 h-12 w-12"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex-1 truncate">
            Family Details
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <Avatar className="w-40 h-40 border-4 border-border">
                <AvatarImage src={photoSrc} alt={person.name} />
                <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="default"
                className="absolute bottom-1 right-1 rounded-full h-10 w-10 shadow-lg"
                onClick={handlePhotoClick}
                disabled={photoMutation.isPending}
                data-testid="button-change-photo"
              >
                {photoMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-photo-upload"
              />
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-2" data-testid="text-person-name">
              {person.name}
            </h2>
            <p className="text-2xl text-muted-foreground" data-testid="text-person-relationship">
              {person.relationship}
            </p>
          </div>

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
                        <span className="font-medium">Spouse:</span> {person.spouse}
                      </p>
                    )}
                    {person.children && person.children.length > 0 && (
                      <div>
                        <p className="text-lg font-medium text-foreground mb-1">
                          Children:
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {person.children.map((child, index) => (
                            <li key={index} className="text-lg text-foreground break-words">
                              {child}
                            </li>
                          ))}
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

      {cropperImage && (
        <PhotoCropper
          imageSrc={cropperImage}
          open={showCropper}
          onClose={handleCropperClose}
          onSave={handleCropperSave}
        />
      )}
    </div>
  );
}
