import { db } from "./db";
import { people } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const photoMappings: Record<string, string> = {
  "Neil Barnett": "Neil Barnett.png",
  "Ted Barnett": "Ted and Melanie.png",
  "Jon Barnett": "Denae and Jon.png",
  "Chris Barnett": "Mary Beth and Chris.png",
  "Mark Barnett": "Jill and Mark.png",
  "Olivia Barnett": "Blaine and Olivia.png",
  "Willa Barnett": "Willa and Leo.png",
  "Ryan Barnett": "Alyssa and Ryan.png",
  "Jack Barnett": "Jack Barnett.png",
  "Nicholas Barnett": "Nick Barnett.png",
  "Charlie Barnett": "Charlie Barnett.png",
  "Sam Barnett": "Sam Barnett.png",
  "Audrey Barnett": "Audrey.png",
  "Weezy Allen": "Weezy Allen.png",
  "Lynn Murray": "Lynn Murray.png",
  "Paige": "Paige.png",
  "Lei": "Lei.png",
  "Kirstin": "Kirstin.png",
  "Deborah": "Deborah.png",
  "Barbara": "Barbara.png",
};

async function addPhotos() {
  console.log("Adding photos to family members...\n");
  
  const photosDir = path.join(process.cwd(), "photos");
  let successCount = 0;
  let failCount = 0;

  for (const [personName, photoFile] of Object.entries(photoMappings)) {
    const photoPath = path.join(photosDir, photoFile);
    
    if (!fs.existsSync(photoPath)) {
      console.log(`⚠️  Photo not found for ${personName}: ${photoFile}`);
      failCount++;
      continue;
    }

    try {
      const photoBuffer = fs.readFileSync(photoPath);
      const base64 = `data:image/png;base64,${photoBuffer.toString("base64")}`;
      
      const result = await db
        .update(people)
        .set({ photoData: base64 })
        .where(eq(people.name, personName))
        .returning({ id: people.id, name: people.name });

      if (result.length > 0) {
        console.log(`✅ Added photo for ${personName}`);
        successCount++;
      } else {
        console.log(`⚠️  Person not found in database: ${personName}`);
        failCount++;
      }
    } catch (error) {
      console.error(`❌ Error adding photo for ${personName}:`, error);
      failCount++;
    }
  }

  console.log(`\n📷 Photo import complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  
  process.exit(0);
}

addPhotos().catch((error) => {
  console.error("Error adding photos:", error);
  process.exit(1);
});
