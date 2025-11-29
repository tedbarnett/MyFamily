import { db } from "./db";
import { people } from "@shared/schema";
import { generateThumbnail } from "./thumbnail";
import { eq } from "drizzle-orm";

async function backfillThumbnails() {
  console.log("Starting thumbnail backfill...");
  
  const allPeople = await db.select().from(people);
  console.log(`Found ${allPeople.length} people to process`);
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const person of allPeople) {
    try {
      if (!person.photoData) {
        console.log(`Skipping ${person.name} - no photo`);
        skipped++;
        continue;
      }
      
      if (person.thumbnailData) {
        console.log(`Skipping ${person.name} - already has thumbnail`);
        skipped++;
        continue;
      }
      
      console.log(`Generating thumbnail for ${person.name}...`);
      const thumbnail = await generateThumbnail(person.photoData);
      
      if (thumbnail) {
        await db.update(people)
          .set({ thumbnailData: thumbnail })
          .where(eq(people.id, person.id));
        console.log(`  ✓ Thumbnail saved for ${person.name}`);
        processed++;
      } else {
        console.log(`  ✗ Failed to generate thumbnail for ${person.name}`);
        errors++;
      }
    } catch (error) {
      console.error(`Error processing ${person.name}:`, error);
      errors++;
    }
  }
  
  console.log("\n=== Backfill Complete ===");
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

backfillThumbnails()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
