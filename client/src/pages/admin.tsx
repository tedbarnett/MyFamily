import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Home, Camera, Loader2, Save, X, Pencil, Plus } from "lucide-react";
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
  other: "Other",
};

const categoryOrder: PersonCategory[] = [
  "husband",
  "children",
  "grandchildren",
  "daughters_in_law",
  "friends",
  "caregivers",
  "other",
];

export default function Admin() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editForm, setEditForm] = useState<Partial<Person>>({});
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addingToCategory, setAddingToCategory] = useState<PersonCategory | null>(null);
  const [addForm, setAddForm] = useState<Partial<Person>>({});

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

  const createMutation = useMutation({
    mutationFn: async (personData: Partial<Person>) => {
      const response = await apiRequest("POST", "/api/person", personData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({
        title: "Person Added",
        description: "New person added successfully.",
      });
      setAddingToCategory(null);
      setAddForm({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add person.",
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
      fullName: person.fullName || "",
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

  const handleAddClick = (category: PersonCategory) => {
    setAddingToCategory(category);
    setAddForm({
      category,
      name: "",
      relationship: categoryLabels[category] === "Husband" ? "Husband" : 
                    categoryLabels[category] === "Children" ? "Son" :
                    categoryLabels[category] === "Grandchildren" ? "Grandchild" :
                    categoryLabels[category] === "Daughters in Law" ? "Daughter in Law" :
                    categoryLabels[category] === "Friends" ? "Friend" :
                    categoryLabels[category] === "Caregivers" ? "Caregiver" : "",
      summary: "",
    });
  };

  const handleAddSave = () => {
    if (!addingToCategory || !addForm.name) return;
    createMutation.mutate({
      ...addForm,
      category: addingToCategory,
      sortOrder: getPeopleByCategory(addingToCategory).length + 1,
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
          <Button
            variant="ghost"
            className="flex-shrink-0 h-auto py-2 px-3 flex flex-col items-center gap-1 text-primary"
            onClick={() => window.open("/", "_blank")}
            data-testid="button-home"
          >
            <Home className="w-10 h-10" strokeWidth={2} />
            <span className="text-xs font-bold">Home</span>
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex-1">
            Admin - Edit People
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {categoryOrder.map((category) => {
          const people = getPeopleByCategory(category);

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
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate" data-testid={`text-name-${person.id}`}>
                              {person.name}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => handleEditClick(person)}
                              data-testid={`button-edit-${person.id}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {person.relationship}
                          </p>
                          {person.summary && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {person.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                <Button
                  variant="outline"
                  className="w-full mt-2 text-primary border-dashed"
                  onClick={() => handleAddClick(category)}
                  data-testid={`button-add-${category}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {categoryLabels[category] === "Children" ? "Child" : 
                       categoryLabels[category] === "Grandchildren" ? "Grandchild" :
                       categoryLabels[category] === "Daughters in Law" ? "Daughter in Law" :
                       categoryLabels[category] === "Friends" ? "Friend" :
                       categoryLabels[category] === "Caregivers" ? "Caregiver" :
                       categoryLabels[category] === "Other" ? "Person" : "Person"}
                </Button>
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
            {editingPerson && ["husband", "children", "grandchildren"].includes(editingPerson.category) && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                <Input
                  value={editForm.fullName || ""}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Full legal name"
                  data-testid="input-edit-fullname"
                />
              </div>
            )}
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

      <Dialog open={!!addingToCategory} onOpenChange={(open) => !open && setAddingToCategory(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Person to {addingToCategory && categoryLabels[addingToCategory]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
              <Input
                value={addForm.name || ""}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Enter name"
                data-testid="input-add-name"
              />
            </div>
            {addingToCategory && ["husband", "children", "grandchildren"].includes(addingToCategory) && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                <Input
                  value={addForm.fullName || ""}
                  onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                  placeholder="Full legal name"
                  data-testid="input-add-fullname"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Relationship *</label>
              <Input
                value={addForm.relationship || ""}
                onChange={(e) => setAddForm({ ...addForm, relationship: e.target.value })}
                placeholder="e.g., Son, Granddaughter, Caregiver"
                data-testid="input-add-relationship"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Summary / About</label>
              <Textarea
                value={addForm.summary || ""}
                onChange={(e) => setAddForm({ ...addForm, summary: e.target.value })}
                rows={3}
                placeholder="Brief description about this person"
                data-testid="input-add-summary"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setAddingToCategory(null)}
              data-testid="button-cancel-add"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleAddSave}
              disabled={createMutation.isPending || !addForm.name}
              data-testid="button-save-add"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Person
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
