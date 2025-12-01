import { db } from "../server/db";
import { people } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

async function updatePhotos() {
  // Sarah - cooking in kitchen
  const sarahPath = path.join(process.cwd(), "attached_assets/generated_images/woman_cooking_in_kitchen_serious.png");
  const sarahBuffer = fs.readFileSync(sarahPath);
  
  const sarahFull = await sharp(sarahBuffer)
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  const sarahThumb = await sharp(sarahBuffer)
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  await db.update(people)
    .set({ 
      photoData: `data:image/jpeg;base64,${sarahFull.toString("base64")}`,
      thumbnailData: `data:image/jpeg;base64,${sarahThumb.toString("base64")}`,
      photos: []
    })
    .where(eq(people.name, "Sarah"));
  
  console.log("Updated Sarah's photo");
  
  // Jennifer - NYU graduation
  const jenniferPath = path.join(process.cwd(), "attached_assets/generated_images/woman_nyu_graduation_gown.png");
  const jenniferBuffer = fs.readFileSync(jenniferPath);
  
  const jenniferFull = await sharp(jenniferBuffer)
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  const jenniferThumb = await sharp(jenniferBuffer)
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  await db.update(people)
    .set({ 
      photoData: `data:image/jpeg;base64,${jenniferFull.toString("base64")}`,
      thumbnailData: `data:image/jpeg;base64,${jenniferThumb.toString("base64")}`,
      photos: []
    })
    .where(eq(people.name, "Jennifer"));
  
  console.log("Updated Jennifer's photo");
  console.log("Done!");
}

updatePhotos().catch(console.error);
