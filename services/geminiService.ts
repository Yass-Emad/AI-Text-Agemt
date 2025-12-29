
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure the environment is configured correctly.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const extractTextWithAI = async (
  fileData: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const ai = getAI();
  
  // Extracting base64 data from the data URL
  const base64Data = fileData.split(',')[1];
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: "Perform high-accuracy text extraction from this file. Maintain the original formatting, lists, and structure as closely as possible. If the document is in multiple languages (like English and Arabic), extract both correctly. Output only the extracted text."
            }
          ]
        }
      ],
      config: {
        temperature: 0.1, // Low temperature for factual extraction
        topP: 0.95,
        topK: 64,
      }
    });

    return response.text || "No text could be extracted.";
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    throw new Error(error.message || "Failed to extract text using AI.");
  }
};
