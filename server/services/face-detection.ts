import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// Default eye position - 0.7 works well for most portrait photos
const DEFAULT_EYE_POSITION = 0.7;

interface FaceDetectionResult {
  eyeCenterY: number;
  confidence: number;
  faceDetected: boolean;
}

interface GeminiFaceResponse {
  faceDetected: boolean;
  eyePositionPercent?: number;
  confidence?: number;
}

export async function detectFacePosition(photoBase64: string): Promise<FaceDetectionResult> {
  try {
    // Extract base64 data and detect mime type
    let base64Data = photoBase64;
    let mimeType = "image/jpeg";
    
    const mimeMatch = photoBase64.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
      base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { 
            text: `Analyze this photo and determine the vertical position of the person's eyes.

If there is a face in the photo:
1. Estimate where the eyes are located vertically as a percentage from the top of the image (0% = top, 100% = bottom)
2. Provide a confidence score from 0.0 to 1.0

If there is no face visible, set faceDetected to false.

Return ONLY a JSON object with these fields:
- faceDetected: boolean
- eyePositionPercent: number (0-100)
- confidence: number (0.0-1.0)` 
          },
          { 
            inlineData: { 
              mimeType,
              data: base64Data 
            } 
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceDetected: { type: Type.BOOLEAN },
            eyePositionPercent: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER }
          },
          required: ["faceDetected"]
        }
      }
    });

    // Parse the response text (following the blueprint pattern)
    const responseText = response.text || "{}";
    console.log("Face detection raw response:", responseText);
    
    const result: GeminiFaceResponse = JSON.parse(responseText);
    
    if (!result.faceDetected) {
      console.log("No face detected, using default position");
      return {
        eyeCenterY: DEFAULT_EYE_POSITION,
        confidence: 0,
        faceDetected: false
      };
    }

    // Convert percentage (0-100) to decimal (0-1) and clamp to reasonable range
    const eyeCenterY = (result.eyePositionPercent || 70) / 100;
    const clampedEyeCenterY = Math.max(0.1, Math.min(0.9, eyeCenterY));

    return {
      eyeCenterY: clampedEyeCenterY,
      confidence: result.confidence || 0.5,
      faceDetected: true
    };

  } catch (error) {
    console.error("Face detection error:", error);
    return {
      eyeCenterY: DEFAULT_EYE_POSITION,
      confidence: 0,
      faceDetected: false
    };
  }
}

export async function batchDetectFacePositions(
  photos: Array<{ id: string; photoData: string }>
): Promise<Map<string, FaceDetectionResult>> {
  const results = new Map<string, FaceDetectionResult>();
  
  for (const photo of photos) {
    try {
      console.log(`Processing face detection for person ${photo.id}...`);
      const result = await detectFacePosition(photo.photoData);
      results.set(photo.id, result);
      
      // Rate limit to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Face detection failed for ${photo.id}:`, error);
      results.set(photo.id, {
        eyeCenterY: DEFAULT_EYE_POSITION,
        confidence: 0,
        faceDetected: false
      });
    }
  }
  
  return results;
}
