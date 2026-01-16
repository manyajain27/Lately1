/**
 * Score Cache Service
 * 
 * Caches aesthetic scores locally using AsyncStorage
 * Uses batch operations for efficiency
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache key prefix
const CACHE_PREFIX = 'score_v1_';

// Cached score structure (minimal footprint)
export interface CachedScore {
    a: number;      // aestheticScore
    u: boolean;     // isUtility
    f: number;      // faceCount
    fav: boolean;   // isFavorite
    fs: number;     // finalScore
    t: number;      // cachedAt timestamp
}

/**
 * Get cached scores for multiple asset IDs
 * Returns a Map of assetId -> CachedScore (only for those that exist in cache)
 */
export async function getCachedScores(assetIds: string[]): Promise<Map<string, CachedScore>> {
    const result = new Map<string, CachedScore>();

    if (assetIds.length === 0) return result;

    try {
        // Build keys
        const keys = assetIds.map(id => CACHE_PREFIX + id);

        // Batch read
        const pairs = await AsyncStorage.multiGet(keys);

        // Parse results
        for (const [key, value] of pairs) {
            if (value) {
                try {
                    const assetId = key.replace(CACHE_PREFIX, '');
                    const score = JSON.parse(value) as CachedScore;
                    result.set(assetId, score);
                } catch {
                    // Invalid cache entry, skip
                }
            }
        }
    } catch (error) {
        console.warn('[ScoreCache] Error reading cache:', error);
    }

    return result;
}

/**
 * Save scores to cache (batch operation)
 * Non-blocking - errors are logged but don't throw
 */
export async function saveScoresToCache(
    scores: Array<{
        assetId: string;
        aestheticScore: number;
        isUtility: boolean;
        faceCount: number;
        isFavorite: boolean;
        finalScore: number;
    }>
): Promise<void> {
    if (scores.length === 0) return;

    try {
        // Build key-value pairs
        const pairs: [string, string][] = scores.map(s => [
            CACHE_PREFIX + s.assetId,
            JSON.stringify({
                a: s.aestheticScore,
                u: s.isUtility,
                f: s.faceCount,
                fav: s.isFavorite,
                fs: s.finalScore,
                t: Date.now(),
            } as CachedScore)
        ]);

        // Batch write
        await AsyncStorage.multiSet(pairs);
    } catch (error) {
        console.warn('[ScoreCache] Error saving to cache:', error);
    }
}

/**
 * Clear all cached scores
 * Useful for debugging or if scoring algorithm changes
 */
export async function clearScoreCache(): Promise<void> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const scoreKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));

        if (scoreKeys.length > 0) {
            await AsyncStorage.multiRemove(scoreKeys);
            console.log(`[ScoreCache] Cleared ${scoreKeys.length} cached scores`);
        }
    } catch (error) {
        console.warn('[ScoreCache] Error clearing cache:', error);
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ count: number; sizeBytes: number }> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const scoreKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));

        let totalSize = 0;
        if (scoreKeys.length > 0) {
            const pairs = await AsyncStorage.multiGet(scoreKeys);
            for (const [, value] of pairs) {
                if (value) totalSize += value.length;
            }
        }

        return { count: scoreKeys.length, sizeBytes: totalSize };
    } catch {
        return { count: 0, sizeBytes: 0 };
    }
}
