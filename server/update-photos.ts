import { db } from "./db";
import { people } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const personToImage: Record<string, string> = {
  "Neil Barnett": "neil_barnett_elderly_patriarch.png",
  "Ted Barnett": "ted_barnett_63yo_son.png",
  "Jon Barnett": "jon_barnett_61yo_son.png",
  "Chris Barnett": "chris_barnett_58yo_son.png",
  "Mark Barnett": "mark_barnett_55yo_son.png",
  "Melanie Craft": "melanie_craft_daughter-in-law.png",
  "Denae Barnett": "denae_barnett_daughter-in-law.png",
  "Mary Beth Barnett": "mary_beth_daughter-in-law.png",
  "Jill Barnett": "jill_barnett_daughter-in-law.png",
  "Olivia Barnett": "olivia_granddaughter_29yo.png",
  "Willa Barnett": "willa_granddaughter_26yo.png",
  "Ryan Barnett": "ryan_grandson_24yo.png",
  "Jack Barnett": "jack_grandson_24yo.png",
  "Nick Barnett": "nick_grandson_19yo.png",
  "Charlie Barnett": "charlie_grandson_19yo_twin.png",
  "Sam Barnett": "sam_grandson_24yo.png",
  "Audrey Barnett": "audrey_granddaughter_22yo.png",
  "Paige": "paige_caregiver.png",
  "Lei": "lei_caregiver.png",
  "Kirstin": "kirstin_caregiver.png",
  "Deborah": "deborah_caregiver.png",
  "Trish": "trish_caregiver.png",
  "Barbara": "barbara_caregiver.png",
  "Ice": "ice_caregiver.png",
  "Tracy": "tracy_caregiver.png",
  "Kris Hehn": "kris_hehn_caregiver.png",
  "Weezy Allen": "weezy_allen_friend.png",
  "Gary Hunninghake": "gary_hunninghake_jills_father.png",
  "Lynn Murray": "lynn_murray_friend.png",
  "Nancy Hunninghake": "nancy_hunninghake_jills_mother.png",
  "Jim Sherlock": "jim_sherlock_neighbor.png",
  "Marilyn Hunter": "marilyn_hunter_neighbor.png",
};

async function generateThumbnail(imageBuffer: Buffer): Promise<string> {
  const thumbnail = await sharp(imageBuffer)
    .resize(512, 512, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${thumbnail.toString("base64")}`;
}

async function updatePhotos() {
  const imagesDir = path.join(process.cwd(), "attached_assets/generated_images");
  
  const allPeople = await db.select().from(people);
  console.log(`Found ${allPeople.length} people in database`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const person of allPeople) {
    const imageFile = personToImage[person.name];
    
    if (!imageFile) {
      console.log(`No image mapping for: ${person.name}`);
      skipped++;
      continue;
    }
    
    const imagePath = path.join(imagesDir, imageFile);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`Image file not found: ${imagePath}`);
      skipped++;
      continue;
    }
    
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;
      const thumbnailData = await generateThumbnail(imageBuffer);
      
      await db.update(people)
        .set({ 
          photoData: base64Image,
          thumbnailData: thumbnailData
        })
        .where(eq(people.id, person.id));
      
      console.log(`Updated photo for: ${person.name}`);
      updated++;
    } catch (error) {
      console.error(`Error updating ${person.name}:`, error);
      skipped++;
    }
  }
  
  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

updatePhotos().catch(console.error);
