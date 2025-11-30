import { db } from "./db";
import { families, people } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function seedDefaultFamily() {
  console.log("Checking for existing families...");
  
  const existingFamilies = await db.select().from(families);
  
  if (existingFamilies.length > 0) {
    console.log(`Found ${existingFamilies.length} existing families. Checking for orphaned people...`);
    
    // Check if there are people without a familyId
    const orphanedPeople = await db.select().from(people).where(isNull(people.familyId));
    
    if (orphanedPeople.length > 0) {
      const defaultFamily = existingFamilies[0];
      console.log(`Assigning ${orphanedPeople.length} people to family "${defaultFamily.name}"...`);
      
      await db.update(people)
        .set({ familyId: defaultFamily.id })
        .where(isNull(people.familyId));
      
      console.log("Done!");
    } else {
      console.log("All people are assigned to families. Nothing to do.");
    }
    return;
  }
  
  console.log("No families found. Creating default Barnett family...");
  
  // Create the default family
  const joinCode = "BARNETT1";
  
  const [family] = await db.insert(families).values({
    slug: "barnett-family",
    name: "The Barnett Family",
    seniorName: "Judy",
    joinCode,
    isActive: true,
  }).returning();
  
  console.log(`Created family: ${family.name} (slug: ${family.slug})`);
  console.log(`Join code: ${joinCode}`);
  
  // Assign all existing people to this family
  const existingPeople = await db.select().from(people);
  
  if (existingPeople.length > 0) {
    console.log(`Assigning ${existingPeople.length} existing people to the Barnett family...`);
    
    await db.update(people)
      .set({ familyId: family.id })
      .where(isNull(people.familyId));
    
    console.log("Done!");
  } else {
    console.log("No existing people found.");
  }
  
  console.log("\n=== Family Setup Complete ===");
  console.log(`Family URL: /barnett-family`);
  console.log(`Join Code: ${joinCode}`);
  console.log("\nTo add family members, they can register using this join code.");
}

seedDefaultFamily()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding family:", error);
    process.exit(1);
  });
