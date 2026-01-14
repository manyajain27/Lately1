import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GeminiService } from './gemini';
import { PhotoMeta, PhotoScore, SceneTag } from '../types';

/**
 * AI Analysis Service (Hybrid: Local Heuristics + Cloud Gemini)
 */

const MOMENT_GAP_MS = 10 * 60 * 1000;
const BURST_GAP_MS = 2 * 1000;
const MAX_SHORTLIST_SIZE = 20; 

interface ScoredCandidate extends PhotoMeta {
    tags: SceneTag[];
    qualityScore: number;
    aestheticScore: number;
    debugReason?: string;
    base64?: string;
}

export async function analyzeAndPick(photos: PhotoMeta[]): Promise<PhotoMeta[]> {
    console.log(`\n\n=== 🧠 STARTING HYBRID AI ANALYSIS (${photos.length} PHOTOS) ===`);

    if (photos.length === 0) return [];

    // 1. Group & Filter (Local)
    const sorted = [...photos].sort((a, b) => a.timestamp - b.timestamp);
    const moments = groupIntoMoments(sorted);
    console.log(`[AI] 📂 Grouping: Found ${moments.length} distinct moments.`);

    let candidates: ScoredCandidate[] = [];
    moments.forEach(moment => {
        // Pick best from bursts
        const burstChamps = pickBurstChampions(moment);
        // Score them locally
        const scored = burstChamps.map(scoreCandidate);
        candidates.push(...scored);
    });
    console.log(`[AI] 📸 Valid Candidates: ${candidates.length}`);

    // 2. Shortlist for Gemini
    const shortlist = createShortlist(candidates, MAX_SHORTLIST_SIZE);
    console.log(`[AI] 🎯 Shortlisted ${shortlist.length} photos for Gemini Vision.`);

    // 3. Generate Thumbnails (Base64)
    console.log(`[AI] 🖼️  Generating thumbnails...`);
    const preparedCandidates = await Promise.all(shortlist.map(async (c) => {
        try {
            const base64 = await generateThumbnail(c.uri);
            return { ...c, base64 };
        } catch (e) {
            console.warn(`Failed to thumbnail ${c.assetId}`, e);
            return null;
        }
    }));
    
    // Filter out failed thumbnails
    const validPayload = preparedCandidates.filter(c => c !== null && c.base64) as ScoredCandidate[]; 

    if (validPayload.length === 0) {
        console.warn("[AI] No valid thumbnails generated. Returning local shortlist.");
        return shortlist.slice(0, 10);
    }

    // 4. Call Gemini
    const geminiResult = await GeminiService.selectBestPhotos(validPayload.map(c => ({
        id: c.assetId,
        base64: c.base64!,
        timestamp: c.timestamp,
        tags: c.tags.map(t => String(t))
    })));

    console.log(`[AI] ♊ Gemini Reasoning: ${geminiResult.reasoning}`);
    console.log(`[AI] ♊ Suggested Caption: "${geminiResult.suggestedCaption}"`);

    // 5. Map back to full objects
    let finalSelection = validPayload.filter(p => geminiResult.selectedIds.includes(p.assetId));

    // Fallback: If Gemini picked < 10, fill from local shortlist
    if (finalSelection.length < 10) {
        console.warn(`[AI] Gemini only picked ${finalSelection.length} photos. Filling from local shortlist...`);
        const usedIds = new Set(finalSelection.map(p => p.assetId));
        
        // Sort remaining by aesthetic score to fill best remaining
        const remaining = shortlist.filter(p => !usedIds.has(p.assetId))
                                   .sort((a, b) => b.aestheticScore - a.aestheticScore);
        
        for (const p of remaining) {
            if (finalSelection.length >= 10) break;
            finalSelection.push(p);
        }
    }

    // Sort: Gemini usually returns IDs in order? If so, map respects it?
    // Actually our filter above might lose order if we iterate validPayload.
    // Let's re-sort finalSelection based on geminiResult.selectedIds order for the first part
    const orderedSelection: PhotoMeta[] = [];
    const selectionMap = new Map(finalSelection.map(p => [p.assetId, p]));
    
    // Add Gemini picks in order
    geminiResult.selectedIds.forEach(id => {
        const p = selectionMap.get(id);
        if (p) {
            orderedSelection.push(p);
            selectionMap.delete(id);
        }
    });
    
    // Add fillers at end
    selectionMap.forEach(p => orderedSelection.push(p));

    // Log final
    console.log(`\n=== ✨ FINAL SELECTION (${orderedSelection.length}) ===`);
    orderedSelection.forEach((p, i) => {
        console.log(`${i+1}. [${p.assetId.slice(-4)}] ${(p as ScoredCandidate).tags.join(', ')}`);
    });

    return orderedSelection;
}

// Helpers

function groupIntoMoments(photos: PhotoMeta[]): PhotoMeta[][] {
    const moments: PhotoMeta[][] = [];
    if (photos.length === 0) return moments;
    let current: PhotoMeta[] = [photos[0]];
    for (let i = 1; i < photos.length; i++) {
        if (photos[i].timestamp - photos[i-1].timestamp > MOMENT_GAP_MS) {
            moments.push(current);
            current = [];
        }
        current.push(photos[i]);
    }
    moments.push(current);
    return moments;
}

function pickBurstChampions(moment: PhotoMeta[]): PhotoMeta[] {
    if (moment.length <= 1) return moment;
    const champions: PhotoMeta[] = [];
    let burst: PhotoMeta[] = [moment[0]];
    for (let i = 1; i < moment.length; i++) {
        if (moment[i].timestamp - moment[i-1].timestamp < BURST_GAP_MS) {
            burst.push(moment[i]);
        } else {
            champions.push(burst[burst.length - 1]);
            burst = [moment[i]];
        }
    }
    champions.push(burst[burst.length - 1]);
    return champions;
}

function scoreCandidate(photo: PhotoMeta): ScoredCandidate {
    const tags: SceneTag[] = [];
    const ratio = photo.width / photo.height;
    if (photo.isScreenshot) tags.push('meme');
    if (ratio < 0.8) tags.push('selfie');
    else if (ratio > 1.2) tags.push('outdoors');
    
    const h = new Date(photo.timestamp).getHours();
    if (h >= 21 || h <= 4) tags.push('night');
    if ((h >= 17 && h <= 19) || (h >= 5 && h <= 7)) tags.push('sunset');

    let aesthetic = 0.5;
    if (tags.includes('sunset')) aesthetic += 0.4;
    else if (tags.includes('outdoors')) aesthetic += 0.2;
    
    return { ...photo, tags, qualityScore: 0.8, aestheticScore: aesthetic };
}

function createShortlist(candidates: ScoredCandidate[], limit: number): ScoredCandidate[] {
    if (candidates.length <= limit) return candidates;
    return [...candidates].sort((a, b) => b.aestheticScore - a.aestheticScore).slice(0, limit);
}

async function generateThumbnail(uri: string): Promise<string> {
    const result = await manipulateAsync(
        uri, 
        [{ resize: { width: 256 } }], 
        { compress: 0.6, format: SaveFormat.JPEG, base64: true }
    );
    return result.base64 || '';
}

export const scorePhotos = async (photos: PhotoMeta[]) => {
    return new Map();
};
