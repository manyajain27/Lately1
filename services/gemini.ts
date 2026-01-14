import { GoogleGenAI } from '@google/genai';

// Initialize Gemini 2.0
// Ensure EXPO_PUBLIC_GEMINI_API_KEY is set in your .env file
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
// Use Flash 1.5 for steady free tier access
const MODEL_NAME = "gemini-1.5-flash";

export interface CandidatePhoto {
    id: string;
    base64: string; // Thumbnail
    timestamp: number;
    tags?: string[];
}

export interface GeminiSelection {
    selectedIds: string[];
    reasoning: string;
    suggestedCaption: string;
}

export const GeminiService = {
    /**
     * analyze and select the best photos using Gemini 2.0 Flash
     */
    async selectBestPhotos(candidates: CandidatePhoto[]): Promise<GeminiSelection> {
        console.log(`[Gemini] ♊ Analyzing ${candidates.length} photos with ${MODEL_NAME}...`);

        if (!API_KEY) {
            console.error("❌ No Gemini API Key found. Set EXPO_PUBLIC_GEMINI_API_KEY.");
            return GeminiService.fallback(candidates, "API Key Missing");
        }

        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            const prompt = `
            You are an expert social media curator. I have attached ${candidates.length} photos.
            TASK: Select exactly 10 photos for a perfect "Instagram Dump".
            
            CRITERIA:
            1. Variety (mix of people, scenery, vibe).
            2. Recipe: 1 Hook, 2 People, 1 Food, 1 Scenery, 1 Night, 1 Meme (optional), fillers.
            3. Order chronologically or by flow.

            OUTPUT JSON ONLY:
            {
              "selectedIds": ["id1", "id2"...],
              "reasoning": "string",
              "captions": ["string"]
            }

            ID Mapping:
            ${candidates.map((c, i) => `Image ${i}: ID ${c.id}`).join('\n')}
            `;

            // Prepare Parts
            // @google/genai generic format:
            // Parts can be { text: "..." } or { inlineData: { mimeType: "...", data: "..." } }
            // Verify payload structure for new SDK
            const imageParts = candidates.map(c => ({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: c.base64
                }
            }));

            const contents = [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        ...imageParts
                    ]
                }
            ];

            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents,
                config: {
                    responseMimeType: "application/json" // Gemini 2.0 supports direct JSON mode!
                }
            });

            // Parse Response
            // In @google/genai, response.text might be a getter or property depending on version
            // Lint says it's a String, not callable.
            const text = response.text;

            if (!text) throw new Error("Empty response");

            console.log("[Gemini] ♊ Response Length:", text.length);

            const data = JSON.parse(text);

            return {
                selectedIds: data.selectedIds || [],
                reasoning: data.reasoning || "AI selection",
                suggestedCaption: (data.captions && data.captions[0]) || "Lately 🫶"
            };

        } catch (error) {
            console.error("[Gemini] ❌ Error:", error);
            return GeminiService.fallback(candidates, "AI Error");
        }
    },

    fallback(candidates: CandidatePhoto[], reason: string): GeminiSelection {
        return {
            selectedIds: candidates.slice(0, 10).map(c => c.id),
            reasoning: `${reason} - Fallback selection`,
            suggestedCaption: "Moments ✨"
        };
    }
};
