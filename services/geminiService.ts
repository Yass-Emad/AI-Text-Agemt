
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const extractTextWithAI = async (
  fileData: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const ai = getAI();
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
              text: `TASK: Perform high-precision OCR and layout extraction.
LANGUAGES: Multi-language support, with primary focus on Arabic and English.
INSTRUCTIONS:
1. Extract ALL text from the images or PDF pages.
2. Maintain the original structure (headings, lists, table data).
3. Ensure Arabic text is correctly joined and flows correctly from right to left where applicable.
4. If there are handwritten notes, transcribe them as accurately as possible.
5. DO NOT add any commentary. Output ONLY the extracted text.`
            }
          ]
        }
      ],
      config: {
        temperature: 0.1,
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
