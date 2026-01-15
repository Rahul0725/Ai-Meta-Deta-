import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeImageWithGemini = async (base64Image: string): Promise<AIAnalysisResult> => {
  try {
    const ai = getAiClient();
    
    // Using gemini-3-flash-preview for fast, multimodal analysis with structured output
    const model = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Analyze this image in detail. Extract visual data, text, and authenticity clues.
            
            Strictly follow the JSON schema.
            - For 'sceneType', use generic terms like Indoor, Outdoor, Nature, Urban, Office, Home.
            - For 'imageCategory', choose one of: Selfie, Document, Screenshot, Photo, Other.
            - For 'faceEmotion', if no face is present, use 'None'.
            - For 'authenticity', look for artifacts, unnatural lighting, or inconsistencies that suggest editing.
            - For 'ocrText', extract all visible text. If no text, return empty string.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of detected objects in the image"
            },
            peopleCount: {
              type: Type.INTEGER,
              description: "Count of people detected"
            },
            sceneType: {
              type: Type.STRING,
              description: "The environment or setting of the image"
            },
            imageCategory: {
              type: Type.STRING,
              enum: ['Selfie', 'Document', 'Screenshot', 'Photo', 'Other'],
              description: "Category of the image"
            },
            dominantColors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Top 5 dominant colors as hex codes or names"
            },
            faceEmotion: {
              type: Type.STRING,
              enum: ['Happy', 'Neutral', 'Sad', 'Angry', 'Surprised', 'None'],
              description: "Dominant facial emotion if applicable"
            },
            isSafe: {
              type: Type.BOOLEAN,
              description: "Whether the image is considered safe (SFW)"
            },
            authenticity: {
              type: Type.OBJECT,
              properties: {
                isLikelyEdited: { type: Type.BOOLEAN },
                reason: { type: Type.STRING },
                score: { type: Type.NUMBER, description: "0 to 100 likelihood score" }
              },
              required: ['isLikelyEdited', 'reason', 'score']
            },
            ocrText: {
              type: Type.STRING,
              description: "All text extracted from the image"
            }
          },
          required: ['objects', 'peopleCount', 'sceneType', 'imageCategory', 'dominantColors', 'faceEmotion', 'isSafe', 'authenticity', 'ocrText']
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as AIAnalysisResult;
      return result;
    } else {
      throw new Error("No response text from Gemini");
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Return a fallback object to prevent app crash
    return {
      objects: [],
      peopleCount: 0,
      sceneType: "Unknown",
      imageCategory: "Other",
      dominantColors: [],
      faceEmotion: "None",
      isSafe: true,
      authenticity: {
        isLikelyEdited: false,
        reason: "Analysis failed",
        score: 0
      },
      ocrText: ""
    };
  }
};