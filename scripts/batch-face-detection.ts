/**
 * Batch Face Detection Script
 * 
 * Processes all existing photos to automatically detect eye/face positions.
 * This sets the eyeCenterY value for optimal cropping on category buttons.
 * 
 * Usage: npx tsx scripts/batch-face-detection.ts [--dry-run]
 * 
 * Options:
 *   --dry-run    Show what would be updated without making changes
 */

import { db } from "../server/db";
import { people } from "../shared/schema";
import { eq } from "drizzle-orm";
import { detectFacePosition } from "../server/services/face-detection";

// Default eye position - 0.70 works well for most portrait photos
const DEFAULT_EYE_POSITION = "0.70";

async function batchProcessFaceDetection(dryRun = false) {
  console.log("Starting batch face detection...");
  console.log(`Using default eye position: ${DEFAULT_EYE_POSITION} when no face detected`);
  console.log(dryRun ? "DRY RUN - no changes will be made\n" : "\n");

  // Get all people with photos
  const allPeople = await db.select().from(people);
  const peopleWithPhotos = allPeople.filter(p => p.photoData);

  console.log(`Found ${peopleWithPhotos.length} people with photos\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const person of peopleWithPhotos) {
    processed++;
    console.log(`[${processed}/${peopleWithPhotos.length}] Processing ${person.name}...`);

    // Skip if already has eyeCenterY set
    if (person.eyeCenterY) {
      console.log(`  ↳ Skipped: already has eyeCenterY=${person.eyeCenterY}`);
      skipped++;
      continue;
    }

    try {
      const result = await detectFacePosition(person.photoData!);

      if (!result.faceDetected) {
        console.log(`  ↳ No face detected, using default ${DEFAULT_EYE_POSITION}`);
        if (!dryRun) {
          await db.update(people)
            .set({ eyeCenterY: DEFAULT_EYE_POSITION })
            .where(eq(people.id, person.id));
        }
        updated++;
      } else if (result.confidence < 0.3) {
        console.log(`  ↳ Low confidence (${result.confidence.toFixed(2)}), using default ${DEFAULT_EYE_POSITION}`);
        if (!dryRun) {
          await db.update(people)
            .set({ eyeCenterY: DEFAULT_EYE_POSITION })
            .where(eq(people.id, person.id));
        }
        updated++;
      } else {
        const eyeCenterY = result.eyeCenterY.toFixed(2);
        console.log(`  ↳ Face detected: eyeCenterY=${eyeCenterY}, confidence=${result.confidence.toFixed(2)}`);
        if (!dryRun) {
          await db.update(people)
            .set({ eyeCenterY })
            .where(eq(people.id, person.id));
        }
        updated++;
      }

      // Rate limit: wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`  ↳ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already set): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (dryRun) {
    console.log("\nThis was a dry run. Run without --dry-run to apply changes.");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

batchProcessFaceDetection(dryRun)
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Batch processing failed:", error);
    process.exit(1);
  });
