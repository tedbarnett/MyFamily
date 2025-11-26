import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Camera, Loader2, Save, X, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PhotoCropper } from "@/components/photo-cropper";
import type { Person, PersonCategory } from "@shared/schema";

const categoryLabels: Record<PersonCategory, string> = {
  husband: "Husband",
  children: "Children",
  grandchildren: "Grandchildren",
  daughters_in_law: "Daughters in Law",
  friends: "Friends",
  caregivers: "Caregivers",
};

const categoryOrder: PersonCategory[] = [
  "husband",
  "children",
  "grandchildren",
  "daughters_in_law",
  "friends",
  "caregivers",
];

export default function Admin() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editForm, setEditForm] = useState<Partial<Person>>({});
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const { data: allPeople = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Person> }) => {
      const response = await apiRequest("PATCH", `/api/person/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({
        title: "Saved",
        description: "Changes saved successfully.",
      });
      setEditingPerson(null);
      setEditForm({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes.",
        variant: "destructive",
      });
    },
  });

  const photoMutation = useMutation({
    mutationFn: async ({ id, photoData }: { id: string; photoData: string }) => {
      const response = await apiRequest("POST", `/api/person/${id}/photo`, { photoData });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({
        title: "Photo Updated",
        description: "Photo saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo.",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getPeopleByCategory = (category: PersonCategory) => {
    return allPeople.filter((p) => p.category === category);
  };

  const handleEditClick = (person: Person) => {
    setEditingPerson(person);
    setEditForm({
      name: person.name,
      relationship: person.relationship,
      born: person.born || "",
      age: person.age || undefined,
      passed: person.passed || "",
      location: person.location || "",
      spouse: person.spouse || "",
      children: person.children || [],
      summary: person.summary || "",
    });
  };

  const handleSave = () => {
    if (!editingPerson) return;
    updateMutation.mutate({
      id: editingPerson.id,
      updates: editForm,
    });
  };

  const handlePhotoClick = (personId: string) => {
    setSelectedPersonId(personId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPersonId) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
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
    event.target.value = "";
  };

  const handleCropperSave = (croppedImage: string) => {
    if (selectedPersonId) {
      photoMutation.mutate({ id: selectedPersonId, photoData: croppedImage });
    }
    setShowCropper(false);
    setCropperImage(null);
    setSelectedPersonId(null);
  };

  const handleCropperClose = () => {
    setShowCropper(false);
    setCropperImage(null);
    setSelectedPersonId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-card border-b border-card-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              className="flex-shrink-0 h-auto py-2 px-3 flex flex-col items-center gap-1 text-primary"
              data-testid="button-back"
            >
              <ArrowLeft className="w-10 h-10" strokeWidth={3} />
              <span className="text-xs font-bold">Back</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex-1">
            Admin - Edit People
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {categoryOrder.map((category) => {
          const people = getPeopleByCategory(category);
          if (people.length === 0) return null;

          return (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">
                {categoryLabels[category]}
              </h2>
              <div className="grid gap-3">
                {people.map((person) => {
                  const photoSrc = person.photoData || person.photoUrl || undefined;
                  return (
                    <Card key={person.id} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <Avatar
                            className="w-16 h-16 cursor-pointer border-2 border-border hover:border-primary transition-colors"
                            onClick={() => handlePhotoClick(person.id)}
                            data-testid={`avatar-edit-${person.id}`}
                          >
                            <AvatarImage src={photoSrc} alt={person.name} />
                            <AvatarFallback className="text-lg bg-muted">
                              {getInitials(person.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                            <Camera className="w-3 h-3 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate" data-testid={`text-name-${person.id}`}>
                            {person.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {person.relationship}
                          </p>
                          {person.summary && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {person.summary}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditClick(person)}
                          data-testid={`button-edit-${person.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-photo-upload"
      />

      {cropperImage && (
        <PhotoCropper
          imageSrc={cropperImage}
          open={showCropper}
          onClose={handleCropperClose}
          onSave={handleCropperSave}
        />
      )}

      <Dialog open={!!editingPerson} onOpenChange={(open) => !open && setEditingPerson(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit {editingPerson?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
              <Input
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Relationship</label>
              <Input
                value={editForm.relationship || ""}
                onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                data-testid="input-edit-relationship"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Born</label>
                <Input
                  value={editForm.born || ""}
                  onChange={(e) => setEditForm({ ...editForm, born: e.target.value })}
                  placeholder="e.g., January 15, 1950"
                  data-testid="input-edit-born"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Age</label>
                <Input
                  type="number"
                  value={editForm.age || ""}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value ? parseInt(e.target.value) : undefined })}
                  data-testid="input-edit-age"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Passed</label>
              <Input
                value={editForm.passed || ""}
                onChange={(e) => setEditForm({ ...editForm, passed: e.target.value })}
                placeholder="Leave empty if living"
                data-testid="input-edit-passed"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <Input
                value={editForm.location || ""}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                data-testid="input-edit-location"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Spouse</label>
              <Input
                value={editForm.spouse || ""}
                onChange={(e) => setEditForm({ ...editForm, spouse: e.target.value })}
                data-testid="input-edit-spouse"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Children (comma separated)</label>
              <Input
                value={(editForm.children || []).join(", ")}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  children: e.target.value.split(",").map(s => s.trim()).filter(s => s) 
                })}
                placeholder="e.g., Sam, Audrey, Jack"
                data-testid="input-edit-children"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Summary / About</label>
              <Textarea
                value={editForm.summary || ""}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                rows={3}
                data-testid="input-edit-summary"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingPerson(null)}
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
