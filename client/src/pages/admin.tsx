import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Home, Camera, Loader2, Save, X, Pencil, Plus, Trash2, BrainCircuit, Mic, Square, Images, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PhotoCropper } from "@/components/photo-cropper";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { Person, PersonCategory, QuizResult } from "@shared/schema";

const categoryLabels: Record<PersonCategory, string> = {
  husband: "Husband",
  children: "Children",
  grandchildren: "Grandchildren",
  daughters_in_law: "Daughters in Law",
  caregivers: "Caregivers",
  other: "Friends & Neighbors",
};

const categoryOrder: PersonCategory[] = [
  "husband",
  "children",
  "grandchildren",
  "daughters_in_law",
  "other",
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
  const [addingToCategory, setAddingToCategory] = useState<PersonCategory | null>(null);
  const [addForm, setAddForm] = useState<Partial<Person>>({});
  const [recordingPersonId, setRecordingPersonId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: allPeople = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: quizResults = [] } = useQuery<QuizResult[]>({
    queryKey: ["/api/quiz-results"],
  });

  // Format quiz results for chart - show last 20 results, oldest first
  const chartData = quizResults
    .slice(0, 20)
    .reverse()
    .map((result, index) => ({
      index: index + 1,
      score: result.score,
      total: result.totalQuestions,
      percentage: Math.round((result.score / result.totalQuestions) * 100),
      date: new Date(result.completedAt).toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      }),
    }));

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Person> }) => {
      const response = await apiRequest("PATCH", `/api/person/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
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

  const addPhotoMutation = useMutation({
    mutationFn: async ({ id, photoData }: { id: string; photoData: string }) => {
      const response = await apiRequest("POST", `/api/person/${id}/photos/add`, { photoData });
      return response.json();
    },
    onSuccess: (updatedPerson: Person) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
      // Update the editing person state so the dialog shows the new photo
      if (editingPerson && editingPerson.id === updatedPerson.id) {
        setEditingPerson(updatedPerson);
      }
      toast({
        title: "Photo Added",
        description: "New photo added to gallery.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add photo.",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async ({ id, photoData }: { id: string; photoData: string }) => {
      const response = await apiRequest("DELETE", `/api/person/${id}/photos`, { photoData });
      return response.json();
    },
    onSuccess: (updatedPerson: Person) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
      // Update the editing person state so the dialog shows the change
      if (editingPerson && editingPerson.id === updatedPerson.id) {
        setEditingPerson(updatedPerson);
      }
      toast({
        title: "Photo Deleted",
        description: "Photo removed from gallery.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo.",
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async ({ id, photoData }: { id: string; photoData: string }) => {
      const response = await apiRequest("POST", `/api/person/${id}/photos/set-primary`, { photoData });
      return response.json();
    },
    onSuccess: (updatedPerson: Person) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
      // Update the editing person state so the dialog shows the change
      if (editingPerson && editingPerson.id === updatedPerson.id) {
        setEditingPerson(updatedPerson);
      }
      toast({
        title: "Primary Photo Set",
        description: "This photo is now the main photo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set primary photo.",
        variant: "destructive",
      });
    },
  });

  const voiceNoteMutation = useMutation({
    mutationFn: async ({ id, voiceNoteData }: { id: string; voiceNoteData: string }) => {
      const response = await apiRequest("POST", `/api/person/${id}/voice-note`, { voiceNoteData });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
      toast({
        title: "Voice Note Updated",
        description: "Voice note saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload voice note.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/person/${id}`);
      return response.json();
    },
    onSuccess: async () => {
      setEditingPerson(null);
      setEditForm({});
      await queryClient.refetchQueries({ queryKey: ["/api/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/static/home"] });
      toast({
        title: "Person Deleted",
        description: "Entry has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete person.",
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
    const defaultRelationship = 
      category === "husband" ? "Husband" : 
      category === "children" ? "Son" :
      category === "grandchildren" ? "Grandchild" :
      category === "daughters_in_law" ? "Daughter in Law" :
      category === "caregivers" ? "Caregiver" : 
      "Family Member";
    setAddForm({
      category,
      name: "",
      relationship: defaultRelationship,
      summary: "",
    });
  };

  const handleAddSave = () => {
    if (!addingToCategory || !addForm.name || !addForm.relationship) {
      toast({
        title: "Required Fields",
        description: "Please fill in both name and relationship.",
        variant: "destructive",
      });
      return;
    }
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
      if (isAddingPhoto) {
        addPhotoMutation.mutate({ id: selectedPersonId, photoData: croppedImage });
      } else {
        photoMutation.mutate({ id: selectedPersonId, photoData: croppedImage });
      }
    }
    setShowCropper(false);
    setCropperImage(null);
    setSelectedPersonId(null);
    setIsAddingPhoto(false);
  };

  const handleCropperClose = () => {
    setShowCropper(false);
    setCropperImage(null);
    setSelectedPersonId(null);
    setIsAddingPhoto(false);
  };

  const handleAddPhotoClick = (personId: string) => {
    setSelectedPersonId(personId);
    setIsAddingPhoto(true);
    addPhotoInputRef.current?.click();
  };

  const handleAddPhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const startRecording = async (personId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported audio format (Safari uses mp4, Chrome/Firefox use webm)
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual MIME type from the recorder
        const actualMimeType = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          voiceNoteMutation.mutate({ id: personId, voiceNoteData: base64 });
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingPersonId(personId);
      toast({
        title: "Recording...",
        description: "Tap the button again to stop.",
      });
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record voice notes.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingPersonId(null);
    }
  };

  const handleVoiceClick = (personId: string) => {
    if (recordingPersonId === personId) {
      stopRecording();
    } else if (recordingPersonId) {
      // Stop current recording first
      stopRecording();
      // Start new recording after a small delay
      setTimeout(() => startRecording(personId), 100);
    } else {
      startRecording(personId);
    }
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
        {/* Quiz Results Chart - Mental Acuity Tracking */}
        {chartData.length > 0 && (
          <Card className="mb-8 p-4">
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Memory Quiz Results</h2>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "percentage") return [`${value}%`, "Score"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Last {chartData.length} quiz{chartData.length !== 1 ? "zes" : ""} • 
              Latest: {chartData.length > 0 ? `${chartData[chartData.length - 1].score}/${chartData[chartData.length - 1].total}` : "—"}
            </p>
          </Card>
        )}

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
                        <Button
                          size="icon"
                          variant={recordingPersonId === person.id ? "destructive" : person.voiceNoteData ? "default" : "outline"}
                          className={`h-10 w-10 flex-shrink-0 ${recordingPersonId === person.id ? "animate-pulse" : ""}`}
                          onClick={() => handleVoiceClick(person.id)}
                          data-testid={`button-voice-${person.id}`}
                        >
                          {recordingPersonId === person.id ? (
                            <Square className="w-5 h-5" />
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </Button>
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

      <input
        ref={addPhotoInputRef}
        type="file"
        accept="image/*"
        onChange={handleAddPhotoFileChange}
        className="hidden"
        data-testid="input-add-photo"
      />

      {cropperImage && (
        <PhotoCropper
          imageSrc={cropperImage}
          open={showCropper}
          onClose={handleCropperClose}
          onSave={handleCropperSave}
        />
      )}

      <Dialog open={!!editingPerson} onOpenChange={(open) => {
        if (!open) {
          setEditingPerson(null);
          setSelectedPersonId(null);
          setIsAddingPhoto(false);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit {editingPerson?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingPerson && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Images className="w-4 h-4 text-primary" />
                  <label className="text-sm font-medium text-foreground">Photos</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const photos: string[] = [];
                    if (editingPerson.photoData) photos.push(editingPerson.photoData);
                    else if (editingPerson.photoUrl) photos.push(editingPerson.photoUrl);
                    if (editingPerson.photos) {
                      editingPerson.photos.forEach(p => {
                        if (!photos.includes(p)) photos.push(p);
                      });
                    }
                    return photos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No photos yet</p>
                    ) : (
                      photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-md border border-border"
                            data-testid={`photo-thumbnail-${index}`}
                          />
                          {photo === (editingPerson.photoData || editingPerson.photoUrl) && (
                            <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 flex gap-1">
                            {photo !== (editingPerson.photoData || editingPerson.photoUrl) && (
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-6 w-6"
                                onClick={() => setPrimaryMutation.mutate({ id: editingPerson.id, photoData: photo })}
                                data-testid={`button-set-primary-${index}`}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-6 w-6"
                              onClick={() => deletePhotoMutation.mutate({ id: editingPerson.id, photoData: photo })}
                              data-testid={`button-delete-photo-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    );
                  })()}
                  <Button
                    variant="outline"
                    className="w-20 h-20 border-dashed flex flex-col items-center justify-center gap-1"
                    onClick={() => handleAddPhotoClick(editingPerson.id)}
                    data-testid="button-add-photo"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs">Add</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tap a photo on the detail page to cycle through. The checkmark shows the main photo.
                </p>
              </div>
            )}
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
          <div className="border-t border-border pt-4 mt-4">
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
              onClick={() => {
                if (editingPerson && confirm(`Are you sure you want to delete ${editingPerson.name}? This cannot be undone.`)) {
                  deleteMutation.mutate(editingPerson.id);
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-person"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Entry
            </Button>
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
