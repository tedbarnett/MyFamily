import sharp from "sharp";

const THUMBNAIL_SIZE = 512;
const THUMBNAIL_QUALITY = 80;

export async function generateThumbnail(
  base64Data: string
): Promise<string | null> {
  try {
    const base64Match = base64Data.match(
      /^data:image\/([a-zA-Z+]+);base64,(.+)$/
    );
    if (!base64Match) {
      console.error("Invalid base64 image format");
      return null;
    }

    const imageBuffer = Buffer.from(base64Match[2], "base64");

    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

export async function generateThumbnailsForPhotos(
  photos: string[]
): Promise<string[]> {
  const thumbnails: string[] = [];
  for (const photo of photos) {
    const thumbnail = await generateThumbnail(photo);
    if (thumbnail) {
      thumbnails.push(thumbnail);
    }
  }
  return thumbnails;
}
