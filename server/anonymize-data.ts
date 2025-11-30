import { db } from "./db";
import { people, families } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

// Map old names to new generic names and photo files
const nameMapping: Record<string, { newName: string; photo: string; relationship: string }> = {
  // Husband
  "Neil Barnett": { newName: "Harold", photo: "husband-01.png", relationship: "Husband" },
  
  // Sons
  "Ted Barnett": { newName: "David", photo: "son-01.png", relationship: "Son" },
  "Jon Barnett": { newName: "Michael", photo: "son-02.png", relationship: "Son" },
  "Chris Barnett": { newName: "Robert", photo: "son-03.png", relationship: "Son" },
  "Mark Barnett": { newName: "James", photo: "son-04.png", relationship: "Son" },
  
  // Daughters-in-law
  "Melanie Craft": { newName: "Sarah", photo: "daughter-in-law-01.png", relationship: "Daughter in Law" },
  "Denae Barnett": { newName: "Jennifer", photo: "daughter-in-law-02.png", relationship: "Daughter in Law" },
  "Mary Beth Barnett": { newName: "Elizabeth", photo: "daughter-in-law-03.png", relationship: "Daughter in Law" },
  "Jill Barnett": { newName: "Amanda", photo: "daughter-in-law-04.png", relationship: "Daughter in Law" },
  
  // Granddaughters
  "Olivia Barnett": { newName: "Emma", photo: "granddaughter-01.png", relationship: "Granddaughter" },
  "Willa Barnett": { newName: "Sophie", photo: "granddaughter-02.png", relationship: "Granddaughter" },
  "Audrey Barnett": { newName: "Lily", photo: "granddaughter-03.png", relationship: "Granddaughter" },
  
  // Grandsons
  "Ryan Barnett": { newName: "Ethan", photo: "grandson-01.png", relationship: "Grandson" },
  "Jack Barnett": { newName: "Noah", photo: "grandson-02.png", relationship: "Grandson" },
  "Nick Barnett": { newName: "Lucas", photo: "grandson-03.png", relationship: "Grandson" },
  "Charlie Barnett": { newName: "Oliver", photo: "grandson-04.png", relationship: "Grandson" },
  "Sam Barnett": { newName: "William", photo: "grandson-05.png", relationship: "Grandson" },
  
  // Caregivers (first names only, keep as-is but with generic photos)
  "Paige": { newName: "Paige", photo: "caregiver-01.png", relationship: "Caregiver" },
  "Lei": { newName: "Lei", photo: "caregiver-02.png", relationship: "Caregiver" },
  "Kirstin": { newName: "Kirstin", photo: "caregiver-03.png", relationship: "Caregiver" },
  "Deborah": { newName: "Deborah", photo: "caregiver-04.png", relationship: "Caregiver" },
  "Trish": { newName: "Trish", photo: "caregiver-05.png", relationship: "Caregiver" },
  "Barbara": { newName: "Barbara", photo: "caregiver-06.png", relationship: "Caregiver" },
  "Ice": { newName: "Ice", photo: "caregiver-07.png", relationship: "Caregiver" },
  "Tracy": { newName: "Tracy", photo: "caregiver-08.png", relationship: "Caregiver" },
  "Kris Hehn": { newName: "Kris", photo: "caregiver-09.png", relationship: "Caregiver" },
  
  // Friends & Neighbors
  "Weezy Allen": { newName: "Dorothy", photo: "friend-01.png", relationship: "Friend" },
  "Gary Hunninghake": { newName: "Frank", photo: "friend-02.png", relationship: "Friend" },
  "Lynn Murray": { newName: "Susan", photo: "friend-03.png", relationship: "Friend" },
  "Nancy Hunninghake": { newName: "Margaret", photo: "friend-04.png", relationship: "Friend" },
  "Jim Sherlock": { newName: "George", photo: "neighbor-01.png", relationship: "Neighbor" },
  "Marilyn Hunter": { newName: "Helen", photo: "neighbor-02.png", relationship: "Neighbor" },
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
        fullName: null,
        spouse: null,
        children: null,
        location: null,
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
