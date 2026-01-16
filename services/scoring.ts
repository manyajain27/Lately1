/**
 * Photo Scoring & Selection Service
 * 
 * Uses native iOS 18 Vision API for aesthetic scoring (on-device, free)
 * + Optional Gemini for final curation from top picks
 * 
 * Same verdict logic as debug tool!
 */

import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { PhotoMeta } from '../types';
import { GeminiService } from './gemini';
import { getCachedScores, saveScoresToCache } from './scoreCache';

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
    isUtility: boolean;
    faceCount: number;
    finalScore: number;
    localUri?: string;
    isFavorite: boolean;  // User marked as favorite
    verdict: 'high' | 'medium' | 'low' | 'excluded';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SHORTLIST_SIZE = 100;    // Captured more good photos (was 50)
const FINAL_SIZE = 10;         // Final dump size
const BATCH_SIZE = 20;         // Process this many at a time (increased for speed)

// ============================================================================
// SCREENSHOT DETECTION (Same as debug tool)
// ============================================================================

function isScreenshot(photo: {
    filename?: string;
    width: number;
    isUtility?: boolean;
}): { is: boolean; reason: string } {
    // Vision API isUtility flag
    if (photo.isUtility) {
        return { is: true, reason: 'Vision API: isUtility = true' };
    }

    // Filename check
    if (photo.filename?.toLowerCase().includes('screenshot')) {
        return { is: true, reason: 'Filename contains "screenshot"' };
    }

    // Common screenshot widths (iPhone/iPad)
    const screenshotWidths = [828, 1125, 1170, 1179, 1242, 1284, 1290, 1320, 2048, 2732];
    if (screenshotWidths.includes(photo.width)) {
        return { is: true, reason: `Width ${photo.width}px matches screenshot` };
    }

    // PNG format (screenshots are usually PNG)
    if (photo.filename?.toLowerCase().endsWith('.png')) {
        return { is: true, reason: 'PNG format' };
    }

    return { is: false, reason: '' };
}

// ============================================================================
// VERDICT LOGIC (Same as debug tool)
// ============================================================================

function getVerdict(photo: ScoredPhoto): 'high' | 'medium' | 'low' | 'excluded' {
    const screenshot = isScreenshot({
        filename: photo.filename,
        width: photo.width,
        isUtility: photo.isUtility,
    });

    if (screenshot.is) return 'excluded';
    if (photo.aestheticScore > 0.3) return 'high';
    if (photo.aestheticScore > 0 && photo.faceCount > 0) return 'medium';
    if (photo.aestheticScore > -0.3) return 'low';
    return 'excluded';
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function analyzeAndPick(
    photos: PhotoMeta[],
    dumpType: string = 'weekly',
    useGemini: boolean = true
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

    // Log score distribution
    const highCount = scored.filter(p => p.verdict === 'high').length;
    const mediumCount = scored.filter(p => p.verdict === 'medium').length;
    const lowCount = scored.filter(p => p.verdict === 'low').length;
    const excludedCount = scored.filter(p => p.verdict === 'excluded').length;

    console.log(`  ├─ Scored ${scored.length} photos`);
    console.log(`  ├─ 🟢 High: ${highCount}, 🟡 Medium: ${mediumCount}, 🟠 Low: ${lowCount}, ❌ Excluded: ${excludedCount}`);

    // ========================================================================
    // STAGE 2: FILTER & CREATE SHORTLIST
    // ========================================================================

    console.log('\n[Stage 2] 🎯 Creating shortlist...');

    // Remove excluded photos (screenshots, utility, poor quality)
    const eligible = scored.filter(p => p.verdict !== 'excluded');
    console.log(`  ├─ ${eligible.length} photos after filtering screenshots`);

    // Sort by final score
    const sorted = eligible.sort((a, b) => b.finalScore - a.finalScore);

    // Create shortlist with time diversity
    const shortlist = createSmartShortlist(sorted, SHORTLIST_SIZE);
    console.log(`  └─ Shortlist: ${shortlist.length} photos`);

    // ========================================================================
    // STAGE 3: FINAL SELECTION (Vision-only or Gemini)
    // ========================================================================

    let final: PhotoMeta[];

    if (useGemini && shortlist.length > FINAL_SIZE) {
        console.log('\n[Stage 3] ✨ Gemini final selection...');
        final = await GeminiService.selectBest(shortlist, FINAL_SIZE);
    } else {
        console.log('\n[Stage 3] 📷 Using Vision-only selection...');
        // Just take top N by score
        final = shortlist.slice(0, FINAL_SIZE);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== ✅ DONE (${final.length} photos in ${elapsed}s) ===\n`);

    return final;
}

// Extended result for debug/preview purposes
export interface ScoringResult {
    final: PhotoMeta[];
    shortlisted: ScoredPhoto[];
    allEligible: ScoredPhoto[];  // Non-screenshots
    excluded: ScoredPhoto[];
}

export async function analyzeAndPickWithDetails(
    photos: PhotoMeta[],
    dumpType: string = 'weekly',
    useGemini: boolean = true
): Promise<ScoringResult> {
    console.log(`\n\n=== 🧠 PHOTO SELECTION (${photos.length} photos) ===`);

    if (photos.length === 0) return { final: [], shortlisted: [], allEligible: [], excluded: [] };

    const startTime = Date.now();

    // STAGE 1: SCORE ALL PHOTOS
    console.log('\n[Stage 1] 📊 Scoring with Apple Vision...');
    const scored = await scoreAllPhotos(photos);

    // Log score distribution
    const highCount = scored.filter(p => p.verdict === 'high').length;
    const mediumCount = scored.filter(p => p.verdict === 'medium').length;
    const lowCount = scored.filter(p => p.verdict === 'low').length;
    const excludedCount = scored.filter(p => p.verdict === 'excluded').length;

    console.log(`  ├─ Scored ${scored.length} photos`);
    console.log(`  ├─ 🟢 High: ${highCount}, 🟡 Medium: ${mediumCount}, 🟠 Low: ${lowCount}, ❌ Excluded: ${excludedCount}`);

    // STAGE 2: FILTER & CREATE SHORTLIST
    console.log('\n[Stage 2] 🎯 Creating shortlist...');

    const eligible = scored.filter(p => p.verdict !== 'excluded');
    const excluded = scored.filter(p => p.verdict === 'excluded');
    console.log(`  ├─ ${eligible.length} photos after filtering screenshots`);

    const sorted = eligible.sort((a, b) => b.finalScore - a.finalScore);
    const shortlist = createSmartShortlist(sorted, SHORTLIST_SIZE);
    console.log(`  └─ Shortlist: ${shortlist.length} photos`);

    // STAGE 3: FINAL SELECTION
    let final: PhotoMeta[];

    if (useGemini && shortlist.length > FINAL_SIZE) {
        console.log('\n[Stage 3] ✨ Gemini final selection...');
        final = await GeminiService.selectBest(shortlist, FINAL_SIZE);
    } else {
        console.log('\n[Stage 3] 📷 Using Vision-only selection...');
        final = shortlist.slice(0, FINAL_SIZE);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== ✅ DONE (${final.length} photos in ${elapsed}s) ===\n`);

    return {
        final,
        shortlisted: shortlist,
        allEligible: eligible,
        excluded,
    };
}

// ============================================================================
// STAGE 1: VISION SCORING
// ============================================================================

async function scoreAllPhotos(photos: PhotoMeta[]): Promise<ScoredPhoto[]> {
    const results: ScoredPhoto[] = [];
    const newScoresToCache: Array<{
        assetId: string;
        aestheticScore: number;
        isUtility: boolean;
        faceCount: number;
        isFavorite: boolean;
        finalScore: number;
    }> = [];

    // ========================================================================
    // STEP 1: Check cache for existing scores
    // ========================================================================
    const assetIds = photos.map(p => p.assetId);
    const cachedScores = await getCachedScores(assetIds);

    const cacheHits = cachedScores.size;
    const cacheMisses = photos.length - cacheHits;

    console.log(`  ├─ Cache: ${cacheHits} hits, ${cacheMisses} misses`);

    // Check if native module is available
    const useNative = Platform.OS === 'ios' && VisionAesthetics?.isAestheticsAvailable?.();

    if (useNative) {
        console.log('  ├─ Using Apple Vision iOS 18');
    } else {
        console.log('  ├─ Using fallback scoring (not iOS 18)');
    }

    // ========================================================================
    // STEP 2: Process each photo (use cache or score)
    // ========================================================================
    let scoredCount = 0;

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const cached = cachedScores.get(photo.assetId);

        // CACHE HIT - Use cached score
        if (cached) {
            const scored: ScoredPhoto = {
                ...photo,
                aestheticScore: cached.a,
                isUtility: cached.u,
                faceCount: cached.f,
                isFavorite: cached.fav,
                finalScore: cached.fs,
                verdict: 'low',
            };
            scored.verdict = getVerdict(scored);
            results.push(scored);
            continue;
        }

        // CACHE MISS - Score with Vision API
        try {
            if (useNative) {
                // Get extended asset info with localUri
                const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.assetId);

                if (!assetInfo.localUri) {
                    results.push(createFallbackScore(photo));
                    continue;
                }

                // Score with Vision API
                let visionResult = { score: 0, isUtility: false };
                let faceResult = { faceCount: 0 };

                try {
                    visionResult = await VisionAesthetics.scoreImage(assetInfo.localUri);
                } catch (e: any) {
                    // Vision error, continue with fallback
                }

                try {
                    faceResult = await VisionAesthetics.detectFaces(assetInfo.localUri);
                } catch (e: any) {
                    // Face detection failure is OK
                }

                // Calculate final score
                let finalScore = visionResult.score;
                if (faceResult.faceCount > 0) finalScore += 0.05;
                if (faceResult.faceCount > 2) finalScore += 0.05;

                // Favorites get a BIG boost
                const isFavorite = assetInfo.isFavorite || false;
                if (isFavorite) finalScore += 5.0;

                const scored: ScoredPhoto = {
                    ...photo,
                    filename: assetInfo.filename,
                    localUri: assetInfo.localUri,
                    aestheticScore: visionResult.score,
                    isUtility: visionResult.isUtility || false,
                    faceCount: faceResult.faceCount || 0,
                    isFavorite,
                    finalScore,
                    verdict: 'low',
                };

                scored.verdict = getVerdict(scored);
                results.push(scored);

                // Queue for cache save
                newScoresToCache.push({
                    assetId: photo.assetId,
                    aestheticScore: visionResult.score,
                    isUtility: visionResult.isUtility || false,
                    faceCount: faceResult.faceCount || 0,
                    isFavorite,
                    finalScore,
                });

                scoredCount++;
            } else {
                // Fallback scoring
                const fallback = createFallbackScore(photo);
                results.push(fallback);

                // Cache fallback too
                newScoresToCache.push({
                    assetId: photo.assetId,
                    aestheticScore: fallback.aestheticScore,
                    isUtility: fallback.isUtility,
                    faceCount: fallback.faceCount,
                    isFavorite: fallback.isFavorite,
                    finalScore: fallback.finalScore,
                });
            }
        } catch (e: any) {
            results.push(createFallbackScore(photo));
        }

        // Progress log every 20 NEW photos scored
        if (scoredCount > 0 && (scoredCount % 20 === 0 || i === photos.length - 1)) {
            console.log(`  ├─ Progress: ${scoredCount}/${cacheMisses} new photos scored`);
        }
    }

    // ========================================================================
    // STEP 3: Save new scores to cache (non-blocking)
    // ========================================================================
    if (newScoresToCache.length > 0) {
        console.log(`  ├─ Caching ${newScoresToCache.length} new scores...`);
        // Fire and forget - don't await
        saveScoresToCache(newScoresToCache).catch((error: unknown) =>
            console.warn('[Scoring] Cache save error:', error)
        );
    }

    return results;
}

function createFallbackScore(photo: PhotoMeta): ScoredPhoto {
    const megapixels = (photo.width * photo.height) / 1_000_000;
    const resScore = Math.min(1, megapixels / 12);

    // Simple screenshot heuristic
    const screenshot = isScreenshot({
        width: photo.width,
        filename: undefined,
    });

    let finalScore = resScore;
    if (screenshot.is) finalScore -= 0.5;

    const scored: ScoredPhoto = {
        ...photo,
        aestheticScore: resScore,
        isUtility: screenshot.is,
        faceCount: 0,
        isFavorite: false,  // Can't know favorites in fallback
        finalScore,
        verdict: 'low',
    };

    scored.verdict = getVerdict(scored);
    return scored;
}

// ============================================================================
// STAGE 2: SMART SHORTLIST
// ============================================================================

// Simplified shortlist: just top scores + favorites
function createSmartShortlist(photos: ScoredPhoto[], maxCount: number): ScoredPhoto[] {
    if (photos.length <= maxCount) return photos;

    // Sort strictly by final score
    const sorted = photos.sort((a, b) => b.finalScore - a.finalScore);

    // STRICT FILTER:
    // 1. Must be a Favorite
    // OR
    // 2. Must be > 0.25 (Good quality)
    // AND then cap at maxCount

    return sorted.filter(p => p.isFavorite || p.finalScore > 0.25).slice(0, maxCount);
}



// ============================================================================
// LEGACY EXPORT
// ============================================================================

export const scorePhotos = async (photos: PhotoMeta[]): Promise<Map<string, any>> => {
    return new Map();
};
