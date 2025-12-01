import * as fs from 'fs';
import { db } from '../server/db';
import { people } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const personId = '116cc8c4-cc93-4255-a696-afc98ad85734';
  const imagePath = 'attached_assets/generated_images/neil_sailboat_racing.png';
  
  // Read the new image
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const newPhotoData = `data:image/png;base64,${base64}`;
  
  // Get current person to preserve existing photos
  const [currentPerson] = await db.select().from(people).where(eq(people.id, personId));
  
  if (!currentPerson) {
    console.error('Person not found');
    process.exit(1);
  }
  
  // Build updated photos array - add new photo to existing array
  const currentPhotos = currentPerson.photos || [];
  const updatedPhotos = [...currentPhotos, newPhotoData];
  
  // Update the record with the new photos array
  await db.update(people)
    .set({ photos: updatedPhotos })
    .where(eq(people.id, personId));
  
  console.log(`Added sailboat racing photo to Neil Hampton. Total photos: ${updatedPhotos.length}`);
  process.exit(0);
}

main().catch(console.error);
