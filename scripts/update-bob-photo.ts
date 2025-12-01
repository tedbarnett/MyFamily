import { db } from "../server/db";
import { people } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

async function updateBobPhoto() {
  const imagePath = path.join(process.cwd(), "attached_assets/generated_images/blonde_curly_man_desk_suit_smiling.png");
  const imageBuffer = fs.readFileSync(imagePath);
  
  const fullSize = await sharp(imageBuffer)
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  const thumbnail = await sharp(imageBuffer)
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  await db.update(people)
    .set({ 
      photoData: `data:image/jpeg;base64,${fullSize.toString("base64")}`,
      thumbnailData: `data:image/jpeg;base64,${thumbnail.toString("base64")}`,
      photos: []
    })
    .where(eq(people.name, "Bob"));
  
  console.log("Updated Bob's photo!");
}

updateBobPhoto().catch(console.error);
