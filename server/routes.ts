import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { PersonCategory } from "@shared/schema";

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
      const validCategories = ["husband", "children", "grandchildren", "friends", "caregivers"];
      
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

  const httpServer = createServer(app);
  return httpServer;
}
