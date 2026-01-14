/**
 * Export Service
 * Handles exporting dumps to device photo library
 * Includes watermark logic for free users
 */

import { Action, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { ExportOptions, ExportResult, PhotoMeta } from '../types';
import { markDumpAsExported } from './database';

// Default export options
const DEFAULT_OPTIONS: ExportOptions = {
    watermark: true,
    quality: 0.95,
    dimensions: {
        width: 1080,
        height: 1350, // Instagram portrait ratio (4:5)
    },
};

// Album name for exports
const ALBUM_NAME = 'Lately Dumps';

/**
 * Request save permissions
 */
export async function requestSavePermission(): Promise<boolean> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
}

/**
 * Get or create the Lately album
 */
async function getOrCreateAlbum(): Promise<MediaLibrary.Album | null> {
    try {
        // Try to find existing album
        const albums = await MediaLibrary.getAlbumsAsync();
        const existing = albums.find(a => a.title === ALBUM_NAME);

        if (existing) return existing;

        // Create placeholder to get album
        // We'll add the first photo and create album with it
        return null;
    } catch (e) {
        console.error('Error getting album:', e);
        return null;
    }
}

/**
 * Resize photo to Instagram dimensions
 */
async function resizeForInstagram(
    uri: string,
    options: ExportOptions
): Promise<string> {
    const actions: Action[] = [
        {
            resize: {
                width: options.dimensions.width,
                height: options.dimensions.height,
            },
        },
    ];

    const result = await manipulateAsync(uri, actions, {
        compress: options.quality,
        format: SaveFormat.JPEG,
    });

    return result.uri;
}

/**
 * Add watermark to photo (for free users)
 * Note: Real implementation would use Skia for proper text overlay
 * This is a placeholder that just returns the original for now
 */
async function addWatermark(uri: string): Promise<string> {
    // TODO: Implement proper watermark using react-native-skia
    // For now, we just return the original URI
    // Real implementation would:
    // 1. Load image into Skia canvas
    // 2. Draw "lately" text in bottom right
    // 3. Export as new image

    console.log('[Export] Watermark would be added here');
    return uri;
}

/**
 * Export a single photo
 */
async function exportPhoto(
    photo: PhotoMeta,
    index: number,
    options: ExportOptions
): Promise<MediaLibrary.Asset | null> {
    try {
        // Resize for Instagram
        let processedUri = await resizeForInstagram(photo.uri, options);

        // Add watermark if needed
        if (options.watermark) {
            processedUri = await addWatermark(processedUri);
        }

        // Save to library
        const asset = await MediaLibrary.createAssetAsync(processedUri);

        return asset;
    } catch (e) {
        console.error(`Failed to export photo ${index}:`, e);
        return null;
    }
}

/**
 * Export full dump to photo library
 */
export async function exportDump(
    photos: PhotoMeta[],
    dumpId: string,
    options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };

    // Check permissions
    const hasPermission = await requestSavePermission();
    if (!hasPermission) {
        return {
            success: false,
            albumName: ALBUM_NAME,
            photoCount: 0,
            error: 'Permission denied',
        };
    }

    try {
        const exportedAssets: MediaLibrary.Asset[] = [];

        // Export each photo in order
        for (let i = 0; i < photos.length; i++) {
            const asset = await exportPhoto(photos[i], i, finalOptions);
            if (asset) {
                exportedAssets.push(asset);
            }
        }

        if (exportedAssets.length === 0) {
            return {
                success: false,
                albumName: ALBUM_NAME,
                photoCount: 0,
                error: 'No photos were exported',
            };
        }

        // Get or create album
        let album = await getOrCreateAlbum();

        if (!album) {
            // Create album with first asset
            album = await MediaLibrary.createAlbumAsync(
                ALBUM_NAME,
                exportedAssets[0],
                false
            );
        }

        // Add remaining assets to album
        if (exportedAssets.length > 1) {
            await MediaLibrary.addAssetsToAlbumAsync(
                exportedAssets.slice(1),
                album,
                false
            );
        }

        // Mark dump as exported in database
        await markDumpAsExported(dumpId);

        return {
            success: true,
            albumName: ALBUM_NAME,
            photoCount: exportedAssets.length,
        };
    } catch (e) {
        console.error('Export failed:', e);
        return {
            success: false,
            albumName: ALBUM_NAME,
            photoCount: 0,
            error: e instanceof Error ? e.message : 'Unknown error',
        };
    }
}

/**
 * Export options for different user tiers
 */
export function getExportOptions(isPro: boolean, watchedAd: boolean): ExportOptions {
    return {
        watermark: !isPro && !watchedAd,
        quality: isPro ? 1.0 : 0.95,
        dimensions: {
            width: 1080,
            height: 1350,
        },
    };
}

/**
 * Get available export ratios
 */
export const EXPORT_RATIOS = {
    instagram_portrait: { width: 1080, height: 1350, label: '4:5 portrait' },
    instagram_square: { width: 1080, height: 1080, label: '1:1 square' },
    instagram_landscape: { width: 1080, height: 608, label: '1.91:1 landscape' },
    story: { width: 1080, height: 1920, label: '9:16 story' },
};
