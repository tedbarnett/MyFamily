import * as fs from 'fs';
import sharp from 'sharp';
import { db } from '../server/db';
import { people } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function generateThumbnail(photoData: string): Promise<string> {
  const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  const thumbnailBuffer = await sharp(imageBuffer)
    .resize(150, 150, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  return `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
}

async function updatePhoto(personId: string, personName: string, imagePath: string) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const photoData = `data:image/png;base64,${base64}`;
  const thumbnailData = await generateThumbnail(photoData);
  
  await db.update(people)
    .set({ 
      photoData, 
      thumbnailData,
      photos: [photoData]
    })
    .where(eq(people.id, personId));
  
  console.log(`Updated photo for ${personName} (${personId})`);
}

async function main() {
  const updates = [
    { id: '0a317e5e-edf0-4595-8062-b8a0b5488877', name: 'Lily', path: 'attached_assets/generated_images/toddler_lily_on_rug.png' },
    { id: '514aa185-ddaf-451d-9875-e9dfe70dce6e', name: 'Noah', path: 'attached_assets/generated_images/toddler_noah_on_rug.png' },
    { id: '6aabd834-fc91-4870-89a8-8f9336bbb571', name: 'Emma', path: 'attached_assets/generated_images/teenage_emma_portrait.png' },
  ];
  
  for (const update of updates) {
    await updatePhoto(update.id, update.name, update.path);
  }
  
  console.log('All photos updated!');
  process.exit(0);
}

main().catch(console.error);
