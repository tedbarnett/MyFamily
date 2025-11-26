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

  const httpServer = createServer(app);
  return httpServer;
}
