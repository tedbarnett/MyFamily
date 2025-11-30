import { db } from "./db";
import { people, families } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

// Map old names to new generic names and photo files (using privacy-friendly generic filenames)
const nameMapping: Record<string, { newName: string; photo: string; relationship: string }> = {
  // Husband
  "Neil Barnett": { newName: "Harold", photo: "person_26.png", relationship: "Husband" },
  
  // Sons
  "Ted Barnett": { newName: "David", photo: "person_29.png", relationship: "Son" },
  "Jon Barnett": { newName: "Michael", photo: "person_30.png", relationship: "Son" },
  "Chris Barnett": { newName: "Robert", photo: "person_31.png", relationship: "Son" },
  "Mark Barnett": { newName: "James", photo: "person_32.png", relationship: "Son" },
  
  // Daughters-in-law
  "Melanie Craft": { newName: "Sarah", photo: "person_10.png", relationship: "Daughter in Law" },
  "Denae Barnett": { newName: "Jennifer", photo: "person_11.png", relationship: "Daughter in Law" },
  "Mary Beth Barnett": { newName: "Elizabeth", photo: "person_12.png", relationship: "Daughter in Law" },
  "Jill Barnett": { newName: "Amanda", photo: "person_13.png", relationship: "Daughter in Law" },
  
  // Granddaughters
  "Olivia Barnett": { newName: "Emma", photo: "person_18.png", relationship: "Granddaughter" },
  "Willa Barnett": { newName: "Sophie", photo: "person_19.png", relationship: "Granddaughter" },
  "Audrey Barnett": { newName: "Lily", photo: "person_20.png", relationship: "Granddaughter" },
  
  // Grandsons
  "Ryan Barnett": { newName: "Ethan", photo: "person_21.png", relationship: "Grandson" },
  "Jack Barnett": { newName: "Noah", photo: "person_22.png", relationship: "Grandson" },
  "Nick Barnett": { newName: "Lucas", photo: "person_23.png", relationship: "Grandson" },
  "Charlie Barnett": { newName: "Oliver", photo: "person_24.png", relationship: "Grandson" },
  "Sam Barnett": { newName: "William", photo: "person_25.png", relationship: "Grandson" },
  
  // Caregivers (first names only, keep as-is but with generic photos)
  "Paige": { newName: "Paige", photo: "person_01.png", relationship: "Caregiver" },
  "Lei": { newName: "Lei", photo: "person_02.png", relationship: "Caregiver" },
  "Kirstin": { newName: "Kirstin", photo: "person_03.png", relationship: "Caregiver" },
  "Deborah": { newName: "Deborah", photo: "person_04.png", relationship: "Caregiver" },
  "Trish": { newName: "Trish", photo: "person_05.png", relationship: "Caregiver" },
  "Barbara": { newName: "Barbara", photo: "person_06.png", relationship: "Caregiver" },
  "Ice": { newName: "Ice", photo: "person_07.png", relationship: "Caregiver" },
  "Tracy": { newName: "Tracy", photo: "person_08.png", relationship: "Caregiver" },
  "Kris Hehn": { newName: "Kris", photo: "person_09.png", relationship: "Caregiver" },
  
  // Friends & Neighbors
  "Weezy Allen": { newName: "Dorothy", photo: "person_14.png", relationship: "Friend" },
  "Gary Hunninghake": { newName: "Frank", photo: "person_15.png", relationship: "Friend" },
  "Lynn Murray": { newName: "Susan", photo: "person_16.png", relationship: "Friend" },
  "Nancy Hunninghake": { newName: "Margaret", photo: "person_17.png", relationship: "Friend" },
  "Jim Sherlock": { newName: "George", photo: "person_27.png", relationship: "Neighbor" },
  "Marilyn Hunter": { newName: "Helen", photo: "person_28.png", relationship: "Neighbor" },
};

async function generateThumbnail(imageBuffer: Buffer): Promise<string> {
  const thumbnail = await sharp(imageBuffer)
    .resize(512, 512, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${thumbnail.toString("base64")}`;
}

async function anonymizeData() {
  const imagesDir = path.join(process.cwd(), "attached_assets/generated_images");
  
  console.log("=== Anonymizing Demo Data ===\n");
  
  // Update family to generic name
  console.log("Updating family name...");
  await db.update(families)
    .set({ 
      name: "Demo Family",
      slug: "demo-family",
      seniorName: "Mom",
      joinCode: "DEMO1234"
    })
    .where(eq(families.slug, "barnett-family"));
  console.log("Family updated to 'Demo Family'\n");
  
  // Get all people
  const allPeople = await db.select().from(people);
  console.log(`Found ${allPeople.length} people to anonymize\n`);
  
  let updated = 0;
  
  for (const person of allPeople) {
    const mapping = nameMapping[person.name];
    
    if (!mapping) {
      console.log(`No mapping for: ${person.name}`);
      continue;
    }
    
    const imagePath = path.join(imagesDir, mapping.photo);
    
    let photoData = person.photoData;
    let thumbnailData = person.thumbnailData;
    
    // Update photo if file exists
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      photoData = `data:image/png;base64,${imageBuffer.toString("base64")}`;
      thumbnailData = await generateThumbnail(imageBuffer);
    }
    
    // Clear any personal info from summary
    let summary = person.summary || "";
    // Remove any references to real names in summary
    summary = summary.replace(/Barnett|Hunninghake|Craft|Sherlock|Murray|Allen/gi, "");
    summary = summary.replace(/\s+/g, " ").trim();
    
    await db.update(people)
      .set({ 
        name: mapping.newName,
        relationship: mapping.relationship,
        photoData,
        thumbnailData,
        summary: summary || null,
        // Clear potentially identifying fields
        location: null,
        phone: null,
        email: null,
      })
      .where(eq(people.id, person.id));
    
    console.log(`${person.name} → ${mapping.newName}`);
    updated++;
  }
  
  console.log(`\n=== Done! Updated ${updated} people ===`);
  console.log("\nNew family URL: /demo-family");
  console.log("New join code: DEMO1234");
  
  process.exit(0);
}

anonymizeData().catch(console.error);
