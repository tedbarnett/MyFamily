import { db } from "../server/db";
import { people } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

async function updateMichaelPhoto() {
  const imagePath = path.join(process.cwd(), "attached_assets/generated_images/balding_man_montana_outdoors.png");
  
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
  
  // Find Michael and update his photo
  const michael = await db.select().from(people).where(eq(people.name, "Michael"));
  
  if (michael.length === 0) {
    console.log("Michael not found in database");
    return;
  }
  
  await db.update(people)
    .set({ 
      photoData,
      thumbnailData,
      photos: []
    })
    .where(eq(people.name, "Michael"));
  
  console.log("Successfully updated Michael's photo!");
}

updateMichaelPhoto().catch(console.error);
