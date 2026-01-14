/**
 * Trip Detection Service
 * Automatically detects trips based on location changes
 */

import { PhotoMeta } from '../types';

// Configuration for trip detection
const TRIP_CONFIG = {
    // Minimum distance from "home" to consider a trip (in degrees, ~50km)
    minDistanceFromHome: 0.5,
    // Minimum number of photos to qualify as a trip
    minPhotos: 5,
    // Maximum time gap between photos in same trip (2 days in ms)
    maxGapBetweenPhotos: 2 * 24 * 60 * 60 * 1000,
    // Minimum trip duration (1 day in ms)
    minTripDuration: 24 * 60 * 60 * 1000,
};

export interface TripInfo {
    id: string;
    startDate: number;
    endDate: number;
    location: {
        latitude: number;
        longitude: number;
    };
    photos: PhotoMeta[];
    estimatedLocationName?: string;
}

export interface HomeLocation {
    latitude: number;
    longitude: number;
    confidence: number;
}

/**
 * Calculate distance between two coordinates (in degrees)
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const latDiff = lat2 - lat1;
    const lonDiff = lon2 - lon1;
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
}

/**
 * Estimate home location from photo history
 * Uses the most frequent location cluster
 */
export function estimateHomeLocation(photos: PhotoMeta[]): HomeLocation | null {
    const locatedPhotos = photos.filter(p => p.location);

    if (locatedPhotos.length < 10) {
        return null;
    }

    // Group photos into location clusters (0.01 degree grid ~1km)
    const clusters = new Map<string, { lat: number; lon: number; count: number }>();

    for (const photo of locatedPhotos) {
        if (!photo.location) continue;

        const gridKey = `${Math.round(photo.location.latitude * 100) / 100},${Math.round(photo.location.longitude * 100) / 100}`;

        if (!clusters.has(gridKey)) {
            clusters.set(gridKey, {
                lat: photo.location.latitude,
                lon: photo.location.longitude,
                count: 0,
            });
        }

        const cluster = clusters.get(gridKey)!;
        cluster.count++;
        // Update to average location
        cluster.lat = (cluster.lat * (cluster.count - 1) + photo.location.latitude) / cluster.count;
        cluster.lon = (cluster.lon * (cluster.count - 1) + photo.location.longitude) / cluster.count;
    }

    // Find the most common cluster (likely home)
    let maxCluster: { lat: number; lon: number; count: number } | null = null;
    for (const cluster of clusters.values()) {
        if (!maxCluster || cluster.count > maxCluster.count) {
            maxCluster = cluster;
        }
    }

    if (!maxCluster || maxCluster.count < 5) {
        return null;
    }

    return {
        latitude: maxCluster.lat,
        longitude: maxCluster.lon,
        confidence: maxCluster.count / locatedPhotos.length,
    };
}

/**
 * Detect trips from photo collection
 */
export function detectTrips(
    photos: PhotoMeta[],
    homeLocation?: HomeLocation | null
): TripInfo[] {
    // Sort photos by timestamp
    const sorted = [...photos]
        .filter(p => p.location)
        .sort((a, b) => a.timestamp - b.timestamp);

    if (sorted.length === 0) {
        return [];
    }

    // Estimate home if not provided
    const home = homeLocation ?? estimateHomeLocation(photos);

    if (!home) {
        // Can't detect trips without home location
        return [];
    }

    const trips: TripInfo[] = [];
    let currentTrip: TripInfo | null = null;

    for (const photo of sorted) {
        if (!photo.location) continue;

        const distanceFromHome = calculateDistance(
            home.latitude,
            home.longitude,
            photo.location.latitude,
            photo.location.longitude
        );

        const isAwayFromHome = distanceFromHome > TRIP_CONFIG.minDistanceFromHome;

        if (isAwayFromHome) {
            if (!currentTrip) {
                // Start new trip
                currentTrip = {
                    id: `trip-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    startDate: photo.timestamp,
                    endDate: photo.timestamp,
                    location: photo.location,
                    photos: [photo],
                };
            } else {
                // Check if this photo belongs to current trip
                const timeSinceLast = photo.timestamp - currentTrip.endDate;

                if (timeSinceLast <= TRIP_CONFIG.maxGapBetweenPhotos) {
                    // Add to current trip
                    currentTrip.photos.push(photo);
                    currentTrip.endDate = photo.timestamp;
                } else {
                    // End current trip, start new one
                    if (isValidTrip(currentTrip)) {
                        trips.push(currentTrip);
                    }

                    currentTrip = {
                        id: `trip-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        startDate: photo.timestamp,
                        endDate: photo.timestamp,
                        location: photo.location,
                        photos: [photo],
                    };
                }
            }
        } else {
            // Back home - end current trip if exists
            if (currentTrip && isValidTrip(currentTrip)) {
                trips.push(currentTrip);
            }
            currentTrip = null;
        }
    }

    // Don't forget the last trip
    if (currentTrip && isValidTrip(currentTrip)) {
        trips.push(currentTrip);
    }

    return trips;
}

/**
 * Check if a trip meets minimum requirements
 */
function isValidTrip(trip: TripInfo): boolean {
    const duration = trip.endDate - trip.startDate;
    return (
        trip.photos.length >= TRIP_CONFIG.minPhotos &&
        duration >= TRIP_CONFIG.minTripDuration
    );
}

/**
 * Get recent trips (last N months)
 */
export function getRecentTrips(
    photos: PhotoMeta[],
    monthsBack: number = 6,
    homeLocation?: HomeLocation | null
): TripInfo[] {
    const cutoff = Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000;
    const recentPhotos = photos.filter(p => p.timestamp >= cutoff);

    return detectTrips(recentPhotos, homeLocation);
}

/**
 * Format trip duration for display
 */
export function formatTripDuration(startDate: number, endDate: number): string {
    const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));

    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 14) return '1 week';
    return `${Math.round(days / 7)} weeks`;
}

/**
 * Get trip date range for display
 */
export function formatTripDateRange(startDate: number, endDate: number): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    if (start.getMonth() === end.getMonth()) {
        return `${months[start.getMonth()]} ${start.getDate()}-${end.getDate()}`;
    }

    return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
}
