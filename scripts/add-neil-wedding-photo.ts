import { db } from "../server/db";
import { people } from "../shared/schema";
import { eq, ilike } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

async function addNeilWeddingPhoto() {
  const imagePath = path.join(process.cwd(), "attached_assets/generated_images/neil_25_wedding_tuxedo_polaroid.png");
  const imageBuffer = fs.readFileSync(imagePath);
  
  // Process the image
  const fullSize = await sharp(imageBuffer)
    .resize(800, 800, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  const photoData = `data:image/jpeg;base64,${fullSize.toString("base64")}`;
  
  // Find Neil (could be "Neil" or "Neil Hampton")
  const neilRecords = await db.select().from(people).where(ilike(people.name, '%neil%'));
  
  if (neilRecords.length === 0) {
    console.log("Neil not found in database");
    return;
  }
  
  const neil = neilRecords[0];
  console.log(`Found Neil: ${neil.name}`);
  
  // Add the wedding photo to Neil's photos array
  const existingPhotos = neil.photos || [];
  const updatedPhotos = [...existingPhotos, photoData];
  
  await db.update(people)
    .set({ photos: updatedPhotos })
    .where(eq(people.id, neil.id));
  
  console.log(`Added wedding photo to Neil's photos (now has ${updatedPhotos.length} additional photos)`);
}

addNeilWeddingPhoto().catch(console.error);
