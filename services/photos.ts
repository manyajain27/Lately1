import * as MediaLibrary from 'expo-media-library';
import { PhotoMeta } from '../types';

/**
 * Service to handle photo library interactions
 */

export const PhotosService = {
    /**
     * Request permissions to access the photo library
     */
    async requestPermissions(): Promise<boolean> {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Check current permission status
     */
    async checkPermissions(): Promise<boolean> {
        const { status } = await MediaLibrary.getPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Get photos within a date range
     */
    async getPhotosInDateRange(startDate: Date, endDate: Date): Promise<PhotoMeta[]> {
        let hasNextPage = true;
        let after: MediaLibrary.Asset | string | undefined;
        let photos: PhotoMeta[] = [];

        // 1. Fetch assets
        while (hasNextPage) {
            const result = await MediaLibrary.getAssetsAsync({
                first: 100, // Fetch in batches
                after: after as string,
                createdAfter: startDate.getTime(),
                createdBefore: endDate.getTime(),
                mediaType: [MediaLibrary.MediaType.photo],
                sortBy: [MediaLibrary.SortBy.creationTime],
            });

            // Process batch
            const batch = result.assets.map(asset => ({
                assetId: asset.id,
                uri: asset.uri,
                timestamp: asset.creationTime,
                width: asset.width,
                height: asset.height,
                mediaType: asset.mediaType as 'photo' | 'video',
                isScreenshot: asset.mediaType === 'photo' && (asset.width === 1125 || asset.width === 1242 || asset.width === 828), // heuristic, simplistic
                location: undefined,
            }));

            photos = [...photos, ...batch];

            hasNextPage = result.hasNextPage;
            after = result.endCursor;

            // Safety limit to prevent infinite loading in dev
            if (photos.length > 500) break;
        }

        return photos;
    },

    /**
     * Get recent photos (last N)
     */
    async getRecentPhotos(limit: number = 20): Promise<PhotoMeta[]> {
        const result = await MediaLibrary.getAssetsAsync({
            first: limit,
            mediaType: [MediaLibrary.MediaType.photo],
            sortBy: [MediaLibrary.SortBy.creationTime],
        });

        return result.assets.map(asset => ({
            assetId: asset.id,
            uri: asset.uri,
            timestamp: asset.creationTime,
            width: asset.width,
            height: asset.height,
            mediaType: asset.mediaType as 'photo' | 'video',
            isScreenshot: false,
        }));
    }
};
