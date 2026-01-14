/**
 * App configuration
 * Reads from environment variables for secrets
 */

// Supabase configuration (from environment)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Cloudflare R2 configuration
export const R2_ACCOUNT_ID = process.env.EXPO_PUBLIC_R2_ACCOUNT_ID ?? '';
export const R2_BUCKET_NAME = process.env.EXPO_PUBLIC_R2_BUCKET_NAME ?? '';
export const R2_ENDPOINT = process.env.EXPO_PUBLIC_R2_ENDPOINT ?? '';
export const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL ?? '';

// Feature flags
export const features = {
    enableCloudAI: true, // Enable cloud AI for scene/aesthetic scoring
    enableLocalML: true, // Enable on-device ML for blur/brightness/faces
    enableSync: true, // Enable cloud sync feature
} as const;

// Dump configuration
export const dumpConfig = {
    // Photo limits per dump type
    weeklyPhotoLimit: 10,
    monthlyPhotoLimit: 15,
    tripPhotoLimit: 20,
    yearlyPhotoLimit: 30,

    // Moment detection
    momentGapMinutes: 10, // Create new moment if gap > 10 minutes
    burstWindowSeconds: 2, // Photos within 2 seconds = burst

    // Selection limits per moment
    photosPerMomentWeekly: 2,
    photosPerMomentMonthly: 3,
    photosPerMomentTrip: 4,

    // Quality thresholds
    minBlurScore: 0.3, // Reject photos below this
    minBrightnessScore: 0.2, // Reject too dark/bright

    // Aesthetic allowances
    maxAestheticBlurWeekly: 1,
    maxAestheticBlurMonthly: 2,
    maxMemeScreenshots: 1,
    maxSelfies: 3,
} as const;

// Export configuration
export const exportConfig = {
    albumName: 'Lately Dumps',
    imageQuality: 0.95,
    watermarkOpacity: 0.6,
    watermarkText: 'lately',
} as const;

// Instagram dimensions
export const instagramDimensions = {
    square: { width: 1080, height: 1080 },
    portrait: { width: 1080, height: 1350 },
    landscape: { width: 1080, height: 608 },
} as const;
