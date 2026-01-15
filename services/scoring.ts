/**
 * Photo Selection Service - Apple Vision + Gemini
 * 
 * Uses iOS 18 Vision framework for aesthetic scoring (on-device, free)
 * + Gemini for final selection from top 50.
 */

import { Platform } from 'react-native';
import { PhotoMeta } from '../types';
import { GeminiService } from './gemini';

// Import native module conditionally
let VisionAesthetics: any = null;
try {
    VisionAesthetics = require('../modules/expo-vision-aesthetics').default;
} catch (e) {
    console.warn('[Scoring] Vision module not available, using fallback');
}

// ============================================================================
// TYPES
// ============================================================================

interface ScoredPhoto extends PhotoMeta {
    aestheticScore: number;
    faceCount: number;
    finalScore: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SHORTLIST_SIZE = 50;     // Send to Gemini
const FINAL_SIZE = 10;         // Final dump size
const BATCH_SIZE = 20;         // Process this many at a time

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function analyzeAndPick(
    photos: PhotoMeta[],
    dumpType: string = 'weekly'
): Promise<PhotoMeta[]> {
    console.log(`\n\n=== 🧠 PHOTO SELECTION (${photos.length} photos) ===`);

    if (photos.length === 0) return [];
    if (photos.length <= FINAL_SIZE) return photos;

    const startTime = Date.now();

    // ========================================================================
    // STAGE 1: SCORE ALL PHOTOS WITH APPLE VISION
    // ========================================================================

    console.log('\n[Stage 1] 📊 Scoring with Apple Vision...');

    const scored = await scoreAllPhotos(photos);
    console.log(`  └─ Scored ${scored.length} photos`);

    // ========================================================================
    // STAGE 2: SMART SHORTLIST (TOP 50 WITH TIME DIVERSITY)
    // ========================================================================

    console.log('\n[Stage 2] 🎯 Creating shortlist...');

    const shortlist = createSmartShortlist(scored, SHORTLIST_SIZE);
    console.log(`  └─ Shortlist: ${shortlist.length} photos`);

    // ========================================================================
    // STAGE 3: GEMINI FINAL SELECTION
    // ========================================================================

    console.log('\n[Stage 3] ✨ Gemini final selection...');

    const final = await GeminiService.selectBest(shortlist, FINAL_SIZE);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== ✅ DONE (${final.length} photos in ${elapsed}s) ===\n`);

    return final;
}

// ============================================================================
// STAGE 1: VISION SCORING
// ============================================================================

async function scoreAllPhotos(photos: PhotoMeta[]): Promise<ScoredPhoto[]> {
    const results: ScoredPhoto[] = [];

    // Check if native module is available
    const useNative = Platform.OS === 'ios' && VisionAesthetics?.isAestheticsAvailable?.();

    if (useNative) {
        console.log('  ├─ Using Apple Vision iOS 18');

        // Process in batches
        for (let i = 0; i < photos.length; i += BATCH_SIZE) {
            const batch = photos.slice(i, i + BATCH_SIZE);
            const uris = batch.map(p => p.uri);

            try {
                const scores = await VisionAesthetics.scoreImageBatch(uris);
                const faces = await Promise.all(uris.map(uri => VisionAesthetics.detectFaces(uri)));

                batch.forEach((photo, idx) => {
                    const aesthetic = scores[idx]?.score ?? 0;
                    const faceCount = faces[idx]?.faceCount ?? 0;

                    // Combine scores: aesthetic + face bonus
                    let finalScore = aesthetic;
                    if (faceCount > 0) finalScore += 0.3;
                    if (faceCount > 2) finalScore += 0.1; // Group photo bonus

                    // Penalize utility photos (screenshots)
                    if (scores[idx]?.isUtility) finalScore -= 0.5;

                    results.push({
                        ...photo,
                        aestheticScore: aesthetic,
                        faceCount,
                        finalScore
                    });
                });

                console.log(`  ├─ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} photos`);
            } catch (error: any) {
                console.warn(`  ├─ Batch error: ${error.message}`);
                // Fallback: add with neutral score
                batch.forEach(photo => {
                    results.push({ ...photo, aestheticScore: 0, faceCount: 0, finalScore: 0 });
                });
            }
        }
    } else {
        console.log('  ├─ Using fallback scoring (not iOS 18)');

        // Simple fallback based on metadata
        photos.forEach(photo => {
            const megapixels = (photo.width * photo.height) / 1_000_000;
            const resScore = Math.min(1, megapixels / 12);

            // Detect likely screenshot
            const isScreenshot = photo.isScreenshot ||
                [1125, 1242, 828, 1170, 1284, 1179].includes(photo.width);

            let finalScore = resScore;
            if (isScreenshot) finalScore -= 0.5;

            results.push({
                ...photo,
                aestheticScore: resScore,
                faceCount: 0,
                finalScore
            });
        });
    }

    return results;
}

// ============================================================================
// STAGE 2: SMART SHORTLIST
// ============================================================================

function createSmartShortlist(photos: ScoredPhoto[], maxCount: number): ScoredPhoto[] {
    // Sort by score (highest first)
    const sorted = [...photos].sort((a, b) => b.finalScore - a.finalScore);

    // Group by time (moments)
    const moments = groupIntoMoments(sorted);

    // Take proportionally from each moment
    const perMoment = Math.ceil(maxCount / Math.max(moments.length, 1));

    const shortlist: ScoredPhoto[] = [];

    for (const moment of moments) {
        const topFromMoment = moment.slice(0, perMoment);
        shortlist.push(...topFromMoment);

        if (shortlist.length >= maxCount) break;
    }

    // Sort final shortlist by score
    return shortlist.sort((a, b) => b.finalScore - a.finalScore).slice(0, maxCount);
}

function groupIntoMoments(photos: ScoredPhoto[]): ScoredPhoto[][] {
    if (photos.length === 0) return [];

    const MOMENT_GAP = 30 * 60 * 1000; // 30 minutes
    const moments: ScoredPhoto[][] = [];
    let currentMoment: ScoredPhoto[] = [];

    // Sort by time for grouping
    const byTime = [...photos].sort((a, b) => a.timestamp - b.timestamp);

    for (const photo of byTime) {
        if (currentMoment.length === 0) {
            currentMoment.push(photo);
        } else {
            const lastTime = currentMoment[currentMoment.length - 1].timestamp;
            if (photo.timestamp - lastTime > MOMENT_GAP) {
                moments.push(currentMoment);
                currentMoment = [photo];
            } else {
                currentMoment.push(photo);
            }
        }
    }

    if (currentMoment.length > 0) {
        moments.push(currentMoment);
    }

    // Sort each moment by score
    return moments.map(m => m.sort((a, b) => b.finalScore - a.finalScore));
}

// ============================================================================
// LEGACY EXPORT
// ============================================================================

export const scorePhotos = async (photos: PhotoMeta[]): Promise<Map<string, any>> => {
    return new Map();
};
