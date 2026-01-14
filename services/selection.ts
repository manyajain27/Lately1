/**
 * Photo Selection Service
 * Recipe-based dump creation following aesthetic rules
 */

import { detectBurstGroups, groupIntoMoments } from '../lib/utils/moments';
import { DumpType, Moment, PhotoMeta, PhotoWithScore, SceneTag } from '../types';
import { getCompositeScore, isAestheticBlur, passesQualityThreshold, pickBurstChampion, scorePhotos } from './scoring';

// Dump size configurations
const DUMP_SIZES = {
    weekly: 10,
    monthly: 15,
    trip: 12,
    yearly: 20,
    manual: 10,
};

// Photos per moment based on dump type
const PHOTOS_PER_MOMENT = {
    weekly: 2,
    monthly: 3,
    trip: 4,
    yearly: 3,
    manual: 3,
};

// Recipe constraints
const RECIPE = {
    maxSelfies: 3,
    maxMemes: 1,
    maxAestheticBlur: {
        weekly: 1,
        monthly: 2,
        trip: 2,
        yearly: 2,
        manual: 1,
    },
};

// Scene distribution targets
const SCENE_TARGETS: Record<SceneTag, number> = {
    sunset: 1,
    sky: 1,
    food: 1,
    indoors: 1,
    outdoors: 2,
    nature: 1,
    night: 1,
    flash: 1,
    pet: 1,
    selfie: 2,
    group: 2,
    detail: 1,
    meme: 1,
    unknown: 0,
};

/**
 * Get burst champions from all moments
 */
async function getBurstChampions(moments: Moment[]): Promise<PhotoMeta[]> {
    const champions: PhotoMeta[] = [];

    for (const moment of moments) {
        const bursts = detectBurstGroups(moment);

        for (const burst of bursts) {
            const champion = await pickBurstChampion(burst.photos);
            champions.push(champion);
        }
    }

    return champions;
}

/**
 * Reduce candidates per moment to top N
 */
async function reduceCandidates(
    moments: Moment[],
    dumpType: DumpType
): Promise<PhotoWithScore[]> {
    const perMoment = PHOTOS_PER_MOMENT[dumpType];
    const candidates: PhotoWithScore[] = [];

    for (const moment of moments) {
        const champions = await getBurstChampions([moment]);
        const scores = await scorePhotos(champions);

        // Score and rank champions
        const scored = champions.map(photo => ({
            ...photo,
            score: scores.get(photo.assetId)!,
        }));

        // Filter by quality
        const quality = scored.filter(p => passesQualityThreshold(p.score));

        // Sort by composite score
        quality.sort((a, b) => getCompositeScore(b.score) - getCompositeScore(a.score));

        // Take top N per moment
        candidates.push(...quality.slice(0, perMoment));
    }

    return candidates;
}

/**
 * Balance selection by scene types
 */
function balanceByScene(
    candidates: PhotoWithScore[],
    targetSize: number,
    dumpType: DumpType
): PhotoWithScore[] {
    const selected: PhotoWithScore[] = [];
    const usedScenes = new Map<SceneTag, number>();
    const maxBlur = RECIPE.maxAestheticBlur[dumpType];
    let blurCount = 0;
    let selfieCount = 0;
    let memeCount = 0;

    // Sort by composite score (best first)
    const sorted = [...candidates].sort(
        (a, b) => getCompositeScore(b.score) - getCompositeScore(a.score)
    );

    // First pass: try to hit scene targets
    for (const photo of sorted) {
        if (selected.length >= targetSize) break;

        const scene = photo.score.sceneTag || 'unknown';
        const currentCount = usedScenes.get(scene) || 0;
        const target = SCENE_TARGETS[scene];

        // Check constraints
        if (scene === 'selfie' && selfieCount >= RECIPE.maxSelfies) continue;
        if (scene === 'meme' && memeCount >= RECIPE.maxMemes) continue;
        if (isAestheticBlur(photo.score) && blurCount >= maxBlur) continue;

        // Prefer variety
        if (currentCount < target) {
            selected.push(photo);
            usedScenes.set(scene, currentCount + 1);

            if (scene === 'selfie') selfieCount++;
            if (scene === 'meme') memeCount++;
            if (isAestheticBlur(photo.score)) blurCount++;
        }
    }

    // Second pass: fill remaining slots with best available
    for (const photo of sorted) {
        if (selected.length >= targetSize) break;
        if (selected.some(p => p.assetId === photo.assetId)) continue;

        const scene = photo.score.sceneTag || 'unknown';

        // Still respect hard limits
        if (scene === 'selfie' && selfieCount >= RECIPE.maxSelfies) continue;
        if (scene === 'meme' && memeCount >= RECIPE.maxMemes) continue;

        selected.push(photo);
        if (scene === 'selfie') selfieCount++;
        if (scene === 'meme') memeCount++;
    }

    return selected;
}

/**
 * Order photos for best dump flow
 */
function orderForDump(photos: PhotoWithScore[]): PhotoWithScore[] {
    if (photos.length === 0) return [];

    // Find hook photo (highest aesthetic score)
    const sorted = [...photos].sort(
        (a, b) => getCompositeScore(b.score) - getCompositeScore(a.score)
    );

    const hook = sorted[0];
    const remaining = sorted.slice(1);

    // Categorize remaining photos
    const people: PhotoWithScore[] = [];
    const vibes: PhotoWithScore[] = [];
    const food: PhotoWithScore[] = [];
    const outdoors: PhotoWithScore[] = [];
    const pets: PhotoWithScore[] = [];
    const nightFlash: PhotoWithScore[] = [];
    const blurry: PhotoWithScore[] = [];
    const memes: PhotoWithScore[] = [];
    const other: PhotoWithScore[] = [];

    for (const photo of remaining) {
        const scene = photo.score.sceneTag;

        if (scene === 'selfie' || scene === 'group') {
            people.push(photo);
        } else if (scene === 'food') {
            food.push(photo);
        } else if (scene === 'outdoors' || scene === 'nature' || scene === 'sunset' || scene === 'sky') {
            outdoors.push(photo);
        } else if (scene === 'pet') {
            pets.push(photo);
        } else if (scene === 'night' || scene === 'flash') {
            nightFlash.push(photo);
        } else if (scene === 'meme') {
            memes.push(photo);
        } else if (isAestheticBlur(photo.score)) {
            blurry.push(photo);
        } else if (scene === 'detail' || scene === 'indoors') {
            vibes.push(photo);
        } else {
            other.push(photo);
        }
    }

    // Build ordered dump following recipe
    const ordered: PhotoWithScore[] = [hook];

    // Add in aesthetic order
    const addIfAvailable = (arr: PhotoWithScore[], count: number = 1) => {
        for (let i = 0; i < count && arr.length > 0; i++) {
            ordered.push(arr.shift()!);
        }
    };

    addIfAvailable(people, 2);      // People after hook
    addIfAvailable(vibes, 1);       // Vibe detail
    addIfAvailable(food, 1);        // Food
    addIfAvailable(outdoors, 2);    // Outdoors
    addIfAvailable(pets, 1);        // Pet
    addIfAvailable(nightFlash, 1);  // Night/flash
    addIfAvailable(blurry, 1);      // Aesthetic blur
    addIfAvailable(memes, 1);       // Meme at end

    // Add any remaining
    addIfAvailable(people);
    addIfAvailable(vibes);
    addIfAvailable(outdoors);
    addIfAvailable(other);

    return ordered;
}

/**
 * Main selection function - creates a complete dump
 */
export async function selectPhotosForDump(
    photos: PhotoMeta[],
    dumpType: DumpType
): Promise<PhotoWithScore[]> {
    if (photos.length === 0) return [];

    const targetSize = DUMP_SIZES[dumpType];

    // Step 1: Group into moments
    const moments = groupIntoMoments(photos);
    console.log(`[Selection] Created ${moments.length} moments from ${photos.length} photos`);

    // Step 2: Get burst champions and reduce candidates
    const candidates = await reduceCandidates(moments, dumpType);
    console.log(`[Selection] Reduced to ${candidates.length} candidates`);

    // Step 3: Balance by scene types
    const balanced = balanceByScene(candidates, targetSize, dumpType);
    console.log(`[Selection] Balanced to ${balanced.length} photos`);

    // Step 4: Order for best dump flow
    const ordered = orderForDump(balanced);
    console.log(`[Selection] Final dump: ${ordered.length} photos`);

    return ordered;
}

/**
 * Get selection summary for UI
 */
export function getSelectionSummary(photos: PhotoWithScore[]): {
    totalPhotos: number;
    sceneBreakdown: Record<string, number>;
    avgScore: number;
} {
    const sceneBreakdown: Record<string, number> = {};
    let totalScore = 0;

    for (const photo of photos) {
        const scene = photo.score.sceneTag || 'unknown';
        sceneBreakdown[scene] = (sceneBreakdown[scene] || 0) + 1;
        totalScore += getCompositeScore(photo.score);
    }

    return {
        totalPhotos: photos.length,
        sceneBreakdown,
        avgScore: photos.length > 0 ? totalScore / photos.length : 0,
    };
}
