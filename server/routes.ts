import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { PersonCategory, Person } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all people
  app.get("/api/people", async (req, res) => {
    try {
      const people = await storage.getAllPeople();
      res.json(people);
    } catch (error) {
      console.error("Error fetching all people:", error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // Get people by category
  app.get("/api/people/:category", async (req, res) => {
    try {
      const category = req.params.category as PersonCategory;
      const validCategories = ["husband", "children", "grandchildren", "daughters_in_law", "friends", "caregivers", "other"];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const people = await storage.getPeopleByCategory(category);
      res.json(people);
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

      res.json(person);
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

  // Update person photo
  app.post("/api/person/:id/photo", async (req, res) => {
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
      console.error("Error updating photo:", error);
      res.status(500).json({ error: "Failed to update photo" });
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

  const httpServer = createServer(app);
  return httpServer;
}
