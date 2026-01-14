/**
 * Watermark Service
 * Handles image resizing and prepares images for export
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Watermark configuration
const WATERMARK_CONFIG = {
    text: 'lately',
    fontSize: 24,
    padding: 16,
    position: 'bottom-right' as const,
};

/**
 * Process image for export (resize to Instagram dimensions)
 * Note: Actual watermark overlay is done in the preview UI component
 * for real-time preview. For permanent watermark, use native modules.
 */
export async function processImageForExport(
    sourceUri: string,
    outputWidth: number = 1080,
    outputHeight: number = 1350
): Promise<string> {
    try {
        const resized = await manipulateAsync(
            sourceUri,
            [{ resize: { width: outputWidth, height: outputHeight } }],
            { compress: 0.95, format: SaveFormat.JPEG }
        );

        return resized.uri;
    } catch (error) {
        console.error('[Watermark] Error processing image:', error);
        throw error;
    }
}

/**
 * Calculate watermark position for different aspect ratios
 */
export function getWatermarkPosition(
    imageWidth: number,
    imageHeight: number,
    position: 'bottom-right' | 'bottom-left' | 'bottom-center' = 'bottom-right'
): { x: number; y: number } {
    const padding = WATERMARK_CONFIG.padding;
    const textWidth = 80; // Approximate width of "lately" text

    switch (position) {
        case 'bottom-left':
            return { x: padding, y: imageHeight - padding };
        case 'bottom-center':
            return { x: (imageWidth - textWidth) / 2, y: imageHeight - padding };
        case 'bottom-right':
        default:
            return { x: imageWidth - textWidth - padding, y: imageHeight - padding };
    }
}

/**
 * Process batch of images for export
 */
export async function processBatchForExport(
    sourceUris: string[],
    outputWidth: number = 1080,
    outputHeight: number = 1350,
    onProgress?: (current: number, total: number) => void
): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < sourceUris.length; i++) {
        const uri = await processImageForExport(sourceUris[i], outputWidth, outputHeight);
        results.push(uri);

        if (onProgress) {
            onProgress(i + 1, sourceUris.length);
        }
    }

    return results;
}

/**
 * Get export dimensions for different ratios
 */
export const EXPORT_DIMENSIONS = {
    instagram_portrait: { width: 1080, height: 1350 },
    instagram_square: { width: 1080, height: 1080 },
    instagram_landscape: { width: 1080, height: 608 },
    story: { width: 1080, height: 1920 },
};

/**
 * Get watermark text for display
 */
export function getWatermarkText(): string {
    return WATERMARK_CONFIG.text;
}
