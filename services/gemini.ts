/**
 * Gemini Service - Final Photo Selection
 * 
 * Receives pre-scored photos and picks the final 10 for the dump.
 */

import { GoogleGenAI } from '@google/genai';
import * as ImageManipulator from 'expo-image-manipulator';
import { PhotoMeta } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = "gemini-2.0-flash";

// ============================================================================
// PROMPT
// ============================================================================

const SELECTION_PROMPT = `Pick the ${'{COUNT}'} best photos for an Instagram photo dump.

RULES:
- First photo = most eye-catching (hook)
- Last photo = strong finish
- Mix people, scenery, moments
- Avoid similar photos back-to-back
- NO screenshots or documents

Return JSON with image numbers (0-based index):
{"picks": [0, 5, 12, ...], "reason": "brief explanation"}`;

// ============================================================================
// SERVICE
// ============================================================================

export const GeminiService = {
    /**
     * Select best photos from pre-scored shortlist
     */
    async selectBest(
        photos: PhotoMeta[],
        count: number
    ): Promise<PhotoMeta[]> {
        if (photos.length <= count) {
            return photos;
        }

        // If no API key, use score-based fallback
        if (!API_KEY) {
            console.warn('[Gemini] No API key, using fallback');
            return this.fallbackSelection(photos, count);
        }

        try {
            // Generate thumbnails
            console.log('  ├─ Generating thumbnails...');
            const thumbnails = await this.generateThumbnails(photos);

            // Call Gemini
            console.log('  ├─ Calling Gemini...');
            const selected = await this.callGemini(thumbnails, count);

            // Map indices back to photos
            const result = selected
                .filter(i => i >= 0 && i < photos.length)
                .map(i => photos[i]);

            if (result.length >= count * 0.5) {
                console.log(`  └─ Selected ${result.length} photos`);
                return result.slice(0, count);
            }

            // If too few selected, fill with fallback
            return this.fallbackSelection(photos, count);

        } catch (error: any) {
            console.error('[Gemini] Error:', error.message?.slice(0, 100));
            return this.fallbackSelection(photos, count);
        }
    },

    async generateThumbnails(photos: PhotoMeta[]): Promise<string[]> {
        const thumbnails: string[] = [];

        for (const photo of photos) {
            try {
                const result = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 256 } }],
                    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.6, base64: true }
                );
                thumbnails.push(result.base64 || '');
            } catch {
                thumbnails.push('');
            }
        }

        return thumbnails;
    },

    async callGemini(thumbnails: string[], count: number): Promise<number[]> {
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const prompt = SELECTION_PROMPT.replace('{COUNT}', String(count));

        // Build parts: prompt + labeled images
        const parts: any[] = [{ text: prompt }];
        thumbnails.forEach((base64, i) => {
            if (base64) {
                parts.push({ text: `\n[Image ${i}]` });
                parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
            }
        });

        let lastError: any;

        // Retry up to 3 times
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: MODEL_NAME,
                    config: { responseMimeType: "application/json", temperature: 0.2 },
                    contents: [{ role: 'user', parts }]
                });

                const text = response.text || '';
                const data = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');

                if (data.picks && Array.isArray(data.picks)) {
                    console.log(`  │  Reason: ${data.reason?.slice(0, 50) || 'N/A'}...`);
                    return data.picks;
                }
            } catch (error: any) {
                lastError = error;
                if (attempt < 3) {
                    console.log(`  │  Retry ${attempt + 1}/3...`);
                    await new Promise(r => setTimeout(r, 2000 * attempt));
                }
            }
        }

        console.error('[Gemini] All retries failed:', lastError?.message?.slice(0, 50));
        throw lastError || new Error('Gemini selection failed');
    },

    fallbackSelection(photos: PhotoMeta[], count: number): PhotoMeta[] {
        console.log('  └─ Using fallback selection');

        // Photos should already be sorted by score, just spread across timeline
        const sorted = [...photos].sort((a, b) => a.timestamp - b.timestamp);
        const step = Math.max(1, Math.floor(sorted.length / count));

        const selected: PhotoMeta[] = [];
        for (let i = 0; i < count && i * step < sorted.length; i++) {
            selected.push(sorted[i * step]);
        }

        return selected;
    }
};
