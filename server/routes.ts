import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { PersonCategory, Person } from "@shared/schema";

// Parse birth date string and compute current age (defensive - never throws)
function computeAgeFromBorn(born: string | null | undefined): number | null {
  if (!born) return null;
  
  try {
    // Try to parse various date formats like "September 22, 1935" or "June 10, 1962"
    const parsed = Date.parse(born);
    if (!Number.isFinite(parsed)) return null;
    
    const birthDate = new Date(parsed);
    // Validate the date is reasonable (year between 1900-2100)
    const year = birthDate.getFullYear();
    if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
    
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age > 0 ? age : null;
  } catch (error) {
    // Any parsing error - just return null, don't crash
    console.error("Error parsing birth date:", born, error);
    return null;
  }
}

// Compute age for display without database updates (fast, read-only, never throws)
function withComputedAge(person: Person): Person {
  try {
    if (!person.born || person.passed) return person;
    
    const computedAge = computeAgeFromBorn(person.born);
    if (computedAge !== null && computedAge !== person.age) {
      return { ...person, age: computedAge };
    }
    return person;
  } catch (error) {
    // If anything fails, just return the original person
    console.error("Error computing age for person:", person.id, error);
    return person;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get static home page data (cached, instant)
  app.get("/api/static/home", async (req, res) => {
    try {
      const staticData = await storage.getStaticHomeData();
      res.json(staticData);
    } catch (error) {
      console.error("Error fetching static home data:", error);
      res.status(500).json({ error: "Failed to fetch home data" });
    }
  });

  // Get lightweight navigation data (just id, name, category - no photos, instant)
  app.get("/api/people-nav", async (req, res) => {
    try {
      const people = await storage.getAllPeople();
      // Return minimal data for navigation - no photos, no heavy data
      const navData = people.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
      }));
      res.json(navData);
    } catch (error) {
      console.error("Error fetching navigation data:", error);
      res.status(500).json({ error: "Failed to fetch navigation data" });
    }
  });

  // Get all people
  app.get("/api/people", async (req, res) => {
    try {
      const people = await storage.getAllPeople();
      // Compute ages on-the-fly without database writes (fast, uses cache)
      const peopleWithAges = people.map(withComputedAge);
      res.json(peopleWithAges);
    } catch (error) {
      console.error("Error fetching all people:", error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // Get people by category
  app.get("/api/people/:category", async (req, res) => {
    try {
      const category = req.params.category as PersonCategory;
      const validCategories = ["husband", "children", "grandchildren", "daughters_in_law", "other", "caregivers"];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const people = await storage.getPeopleByCategory(category);
      // Compute ages on-the-fly without database writes (fast)
      const peopleWithAges = people.map(withComputedAge);
      res.json(peopleWithAges);
    } catch (error) {
      console.error("Error fetching people by category:", error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // Get person by ID
  app.get("/api/person/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const person = await storage.getPersonById(id);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      // Compute age on-the-fly without database writes (fast)
      const personWithAge = withComputedAge(person);
      res.json(personWithAge);
    } catch (error) {
      console.error("Error fetching person:", error);
      res.status(500).json({ error: "Failed to fetch person" });
    }
  });

  // Search people
  app.get("/api/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const results = await storage.searchPeople(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching people:", error);
      res.status(500).json({ error: "Failed to search people" });
    }
  });

  // Update person photo (sets as primary and adds to photos array)
  app.post("/api/person/:id/photo", async (req, res) => {
    try {
      const { id } = req.params;
      const { photoData } = req.body;

      if (!photoData) {
        return res.status(400).json({ error: "Photo data required" });
      }

      // Get current person to access existing photos
      const currentPerson = await storage.getPersonById(id);
      if (!currentPerson) {
        return res.status(404).json({ error: "Person not found" });
      }

      // Add to photos array if not already there
      const currentPhotos = currentPerson.photos || [];
      const updatedPhotos = currentPhotos.includes(photoData) 
        ? currentPhotos 
        : [...currentPhotos, photoData];

      const person = await storage.updatePerson(id, { 
        photoData,
        photos: updatedPhotos 
      });

      res.json(person);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ error: "Failed to update photo" });
    }
  });

  // Add a photo to person's gallery (without changing primary)
  app.post("/api/person/:id/photos/add", async (req, res) => {
    try {
      const { id } = req.params;
      const { photoData } = req.body;

      if (!photoData) {
        return res.status(400).json({ error: "Photo data required" });
      }

      const currentPerson = await storage.getPersonById(id);
      if (!currentPerson) {
        return res.status(404).json({ error: "Person not found" });
      }

      const currentPhotos = currentPerson.photos || [];
      
      // Don't add duplicates
      if (currentPhotos.includes(photoData)) {
        return res.json(currentPerson);
      }

      const updatedPhotos = [...currentPhotos, photoData];
      
      // If this is the first photo, also set it as primary
      const updates: Partial<Person> = { photos: updatedPhotos };
      if (!currentPerson.photoData) {
        updates.photoData = photoData;
      }

      const person = await storage.updatePerson(id, updates);
      res.json(person);
    } catch (error) {
      console.error("Error adding photo:", error);
      res.status(500).json({ error: "Failed to add photo" });
    }
  });

  // Set a photo as the primary/active photo
  app.post("/api/person/:id/photos/set-primary", async (req, res) => {
    try {
      const { id } = req.params;
      const { photoData } = req.body;

      if (!photoData) {
        return res.status(400).json({ error: "Photo data required" });
      }

      const person = await storage.updatePerson(id, { photoData });
      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json(person);
    } catch (error) {
      console.error("Error setting primary photo:", error);
      res.status(500).json({ error: "Failed to set primary photo" });
    }
  });

  // Delete a photo from person's gallery
  app.delete("/api/person/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photoData } = req.body;

      if (!photoData) {
        return res.status(400).json({ error: "Photo data required" });
      }

      const currentPerson = await storage.getPersonById(id);
      if (!currentPerson) {
        return res.status(404).json({ error: "Person not found" });
      }

      const currentPhotos = currentPerson.photos || [];
      const updatedPhotos = currentPhotos.filter(p => p !== photoData);
      
      // If we're deleting the primary photo, set a new primary or clear it
      const updates: Partial<Person> = { photos: updatedPhotos };
      if (currentPerson.photoData === photoData) {
        updates.photoData = updatedPhotos.length > 0 ? updatedPhotos[0] : null;
      }

      const person = await storage.updatePerson(id, updates);
      res.json(person);
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Update person voice note
  app.post("/api/person/:id/voice-note", async (req, res) => {
    try {
      const { id } = req.params;
      const { voiceNoteData } = req.body;

      if (!voiceNoteData) {
        return res.status(400).json({ error: "Voice note data required" });
      }

      const person = await storage.updatePerson(id, { voiceNoteData });
      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json(person);
    } catch (error) {
      console.error("Error updating voice note:", error);
      res.status(500).json({ error: "Failed to update voice note" });
    }
  });

  // Create new person
  app.post("/api/person", async (req, res) => {
    try {
      const personData = req.body;

      if (!personData.name || !personData.category || !personData.relationship) {
        return res.status(400).json({ error: "Name, category, and relationship are required" });
      }

      const person = await storage.createPerson(personData);
      res.status(201).json(person);
    } catch (error) {
      console.error("Error creating person:", error);
      res.status(500).json({ error: "Failed to create person" });
    }
  });

  // Update person data
  app.patch("/api/person/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates: Partial<Person> = req.body;

      // Remove id from updates if present
      delete (updates as any).id;

      const person = await storage.updatePerson(id, updates);
      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json(person);
    } catch (error) {
      console.error("Error updating person:", error);
      res.status(500).json({ error: "Failed to update person" });
    }
  });

  // Delete person
  app.delete("/api/person/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePerson(id);

      if (!deleted) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting person:", error);
      res.status(500).json({ error: "Failed to delete person" });
    }
  });

  // Record visit
  app.post("/api/person/:id/visit", async (req, res) => {
    try {
      const { id } = req.params;
      const { visitDate } = req.body;

      const date = visitDate || new Date().toISOString();
      const person = await storage.recordVisit(id, date);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json(person);
    } catch (error) {
      console.error("Error recording visit:", error);
      res.status(500).json({ error: "Failed to record visit" });
    }
  });

  // Save quiz result
  app.post("/api/quiz-result", async (req, res) => {
    try {
      const { score, totalQuestions } = req.body;

      if (typeof score !== "number" || typeof totalQuestions !== "number") {
        return res.status(400).json({ error: "Score and totalQuestions are required" });
      }

      const result = await storage.saveQuizResult({ score, totalQuestions });
      res.status(201).json(result);
    } catch (error) {
      console.error("Error saving quiz result:", error);
      res.status(500).json({ error: "Failed to save quiz result" });
    }
  });

  // Get quiz results history
  app.get("/api/quiz-results", async (req, res) => {
    try {
      const results = await storage.getQuizResults();
      res.json(results);
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      res.status(500).json({ error: "Failed to fetch quiz results" });
    }
  });

  // Prime the cache on startup so the first user request is instant
  console.log("Priming cache on server startup...");
  await storage.getStaticHomeData();
  console.log("Cache primed and ready!");

  const httpServer = createServer(app);
  return httpServer;
}
