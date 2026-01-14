/**
 * Moments & Burst Detection Utilities
 * Groups photos into logical moments and detects burst shots
 */

import { BurstGroup, Moment, PhotoMeta } from '../../types';

// Time gap to create a new moment (10 minutes in ms)
const MOMENT_GAP_MS = 10 * 60 * 1000;

// Time gap to detect burst photos (2 seconds in ms)
const BURST_GAP_MS = 2 * 1000;

// Distance threshold for location-based moment split (in degrees, ~500m)
const LOCATION_THRESHOLD = 0.005;

/**
 * Generate a unique ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate distance between two locations (simplified)
 */
function getLocationDistance(
    loc1?: { latitude: number; longitude: number },
    loc2?: { latitude: number; longitude: number }
): number {
    if (!loc1 || !loc2) return 0;

    const latDiff = Math.abs(loc1.latitude - loc2.latitude);
    const lonDiff = Math.abs(loc1.longitude - loc2.longitude);

    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
}

/**
 * Group photos into moments based on time gaps and location changes
 * A moment is a logical grouping of photos taken close together
 */
export function groupIntoMoments(photos: PhotoMeta[]): Moment[] {
    if (photos.length === 0) return [];

    // Sort photos by timestamp
    const sorted = [...photos].sort((a, b) => a.timestamp - b.timestamp);

    const moments: Moment[] = [];
    let currentMoment: Moment = {
        id: generateId(),
        photos: [sorted[0]],
        startTime: sorted[0].timestamp,
        endTime: sorted[0].timestamp,
        location: sorted[0].location,
    };

    for (let i = 1; i < sorted.length; i++) {
        const photo = sorted[i];
        const prevPhoto = sorted[i - 1];
        const timeGap = photo.timestamp - prevPhoto.timestamp;
        const locationDist = getLocationDistance(photo.location, prevPhoto.location);

        // Create new moment if time gap is large OR location changed significantly
        const shouldSplit = timeGap > MOMENT_GAP_MS || locationDist > LOCATION_THRESHOLD;

        if (shouldSplit) {
            // Save current moment and start new one
            moments.push(currentMoment);
            currentMoment = {
                id: generateId(),
                photos: [photo],
                startTime: photo.timestamp,
                endTime: photo.timestamp,
                location: photo.location,
            };
        } else {
            // Add to current moment
            currentMoment.photos.push(photo);
            currentMoment.endTime = photo.timestamp;

            // Update location if current photo has one
            if (photo.location && !currentMoment.location) {
                currentMoment.location = photo.location;
            }
        }
    }

    // Don't forget the last moment
    moments.push(currentMoment);

    return moments;
}

/**
 * Detect burst groups within a moment
 * Burst = photos taken within 1-2 seconds of each other
 */
export function detectBurstGroups(moment: Moment): BurstGroup[] {
    if (moment.photos.length === 0) return [];

    const sorted = [...moment.photos].sort((a, b) => a.timestamp - b.timestamp);
    const groups: BurstGroup[] = [];

    let currentBurst: BurstGroup = {
        id: generateId(),
        photos: [sorted[0]],
    };

    for (let i = 1; i < sorted.length; i++) {
        const photo = sorted[i];
        const prevPhoto = sorted[i - 1];
        const timeGap = photo.timestamp - prevPhoto.timestamp;

        if (timeGap <= BURST_GAP_MS) {
            // Part of current burst
            currentBurst.photos.push(photo);
        } else {
            // End current burst and start new one
            groups.push(currentBurst);
            currentBurst = {
                id: generateId(),
                photos: [photo],
            };
        }
    }

    // Don't forget the last burst
    groups.push(currentBurst);

    return groups;
}

/**
 * Get all burst groups from all moments
 */
export function getAllBurstGroups(moments: Moment[]): BurstGroup[] {
    return moments.flatMap(moment => detectBurstGroups(moment));
}

/**
 * Count photos per moment for stats
 */
export function getMomentStats(moments: Moment[]): {
    totalMoments: number;
    totalPhotos: number;
    avgPhotosPerMoment: number;
    largestMoment: number;
} {
    const totalMoments = moments.length;
    const totalPhotos = moments.reduce((sum, m) => sum + m.photos.length, 0);
    const largestMoment = Math.max(...moments.map(m => m.photos.length), 0);

    return {
        totalMoments,
        totalPhotos,
        avgPhotosPerMoment: totalMoments > 0 ? totalPhotos / totalMoments : 0,
        largestMoment,
    };
}
