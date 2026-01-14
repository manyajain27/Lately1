/**
 * Lately - TypeScript Type Definitions
 */

// ============================================================================
// AUTH TYPES
// ============================================================================
export interface User {
    id: string;
    email: string;
    createdAt: string;
    isPro: boolean;
}

export interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

// ============================================================================
// PHOTO TYPES
// ============================================================================
export interface PhotoMeta {
    assetId: string;
    uri: string;
    timestamp: number;
    width: number;
    height: number;
    mediaType: 'photo' | 'video';
    isScreenshot: boolean;
    location?: {
        latitude: number;
        longitude: number;
    };
}

export interface PhotoScore {
    assetId: string;
    blurScore: number; // 0-1, higher = sharper
    brightnessScore: number; // 0-1, 0.5 = ideal
    faceCount: number;
    faceScore: number; // 0-1, based on size/clarity
    sceneTag?: SceneTag;
    aestheticScore?: number; // 0-1, from cloud AI
    cachedAt: number;
}

export type SceneTag =
    | 'sunset'
    | 'sky'
    | 'food'
    | 'indoors'
    | 'outdoors'
    | 'nature'
    | 'night'
    | 'flash'
    | 'pet'
    | 'selfie'
    | 'group'
    | 'detail'
    | 'meme'
    | 'unknown';

export interface PhotoWithScore extends PhotoMeta {
    score: PhotoScore;
}

// ============================================================================
// MOMENT / BURST TYPES
// ============================================================================
export interface Moment {
    id: string;
    photos: PhotoMeta[];
    startTime: number;
    endTime: number;
    location?: {
        latitude: number;
        longitude: number;
    };
}

export interface BurstGroup {
    id: string;
    photos: PhotoMeta[];
    champion?: PhotoMeta; // Best photo from burst
}

// ============================================================================
// DUMP TYPES
// ============================================================================
export type DumpType = 'weekly' | 'monthly' | 'trip' | 'yearly' | 'manual';

export interface Dump {
    id: string;
    type: DumpType;
    title: string;
    startDate: number;
    endDate: number;
    selectedAssetIds: string[];
    ordering: number[]; // indices into selectedAssetIds
    preset?: string;
    caption?: string;
    isViewed: boolean;
    isExported: boolean;
    exportedAt?: number;
    synced: boolean;
    createdAt: number;
}

export interface DumpPreview {
    dump: Dump;
    photos: PhotoMeta[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================
export interface ExportOptions {
    watermark: boolean;
    quality: number;
    dimensions: {
        width: number;
        height: number;
    };
}

export interface ExportResult {
    success: boolean;
    albumName: string;
    photoCount: number;
    error?: string;
}

// ============================================================================
// SYNC TYPES
// ============================================================================
export interface SyncStatus {
    isSyncing: boolean;
    lastSyncAt?: number;
    pendingUploads: number;
    error?: string;
}

// ============================================================================
// DATABASE TYPES (SQLite)
// ============================================================================
export interface PhotoCacheRow {
    asset_id: string;
    blur_score: number;
    brightness_score: number;
    face_count: number;
    face_score: number;
    scene_tag: string | null;
    aesthetic_score: number | null;
    cached_at: number;
}

export interface DumpRow {
    id: string;
    type: string;
    title: string;
    start_date: number;
    end_date: number;
    selected_assets: string; // JSON string
    ordering: string; // JSON string
    preset: string | null;
    caption: string | null;
    is_viewed: number;
    is_exported: number;
    exported_at: number | null;
    synced: number;
    created_at: number;
}

// ============================================================================
// UI TYPES
// ============================================================================
export interface ButtonVariant {
    variant: 'primary' | 'secondary' | 'ghost';
    size?: 'default' | 'small';
}

export interface TextVariant {
    variant: 'titleXL' | 'titleL' | 'titleM' | 'bodyL' | 'bodyM' | 'bodyS' | 'caption';
    color?: 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'accent';
}
