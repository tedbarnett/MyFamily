import { db } from "../server/db";
import { people } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

async function updateJamesPhoto() {
  const imagePath = path.join(process.cwd(), "attached_assets/generated_images/blonde_curly-haired_thin_man_55.png");
  
  // Read and process the image
  const imageBuffer = fs.readFileSync(imagePath);
  
  // Create full-size version (max 800px)
  const fullSize = await sharp(imageBuffer)
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  // Create thumbnail (200px)
  const thumbnail = await sharp(imageBuffer)
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  const photoData = `data:image/jpeg;base64,${fullSize.toString("base64")}`;
  const thumbnailData = `data:image/jpeg;base64,${thumbnail.toString("base64")}`;
  
  // Find James and update his photo
  const james = await db.select().from(people).where(eq(people.name, "James"));
  
  if (james.length === 0) {
    console.log("James not found in database");
    return;
  }
  
  await db.update(people)
    .set({ 
      photoData,
      thumbnailData,
      photos: [] // Clear additional photos
    })
    .where(eq(people.name, "James"));
  
  console.log("Successfully updated James's photo!");
}

updateJamesPhoto().catch(console.error);
