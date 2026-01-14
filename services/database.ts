/**
 * SQLite Database Service
 * Local caching for photo scores and dumps
 */

import * as SQLite from 'expo-sqlite';
import type { Dump, DumpRow, PhotoCacheRow, PhotoScore, SceneTag } from '../types';

const DB_NAME = 'lately.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<void> {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create photo cache table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS photo_cache (
      asset_id TEXT PRIMARY KEY,
      blur_score REAL DEFAULT 0,
      brightness_score REAL DEFAULT 0,
      face_count INTEGER DEFAULT 0,
      face_score REAL DEFAULT 0,
      scene_tag TEXT,
      aesthetic_score REAL,
      cached_at INTEGER NOT NULL
    );
  `);

    // Create dumps table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dumps (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      selected_assets TEXT NOT NULL,
      ordering TEXT NOT NULL,
      preset TEXT,
      caption TEXT,
      is_viewed INTEGER DEFAULT 0,
      is_exported INTEGER DEFAULT 0,
      exported_at INTEGER,
      synced INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

    // Create indices for common queries
    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_photo_cache_cached_at ON photo_cache(cached_at);
    CREATE INDEX IF NOT EXISTS idx_dumps_type ON dumps(type);
    CREATE INDEX IF NOT EXISTS idx_dumps_created_at ON dumps(created_at);
  `);
}

/**
 * Get database instance
 */
function getDb(): SQLite.SQLiteDatabase {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// ============================================================================
// PHOTO CACHE OPERATIONS
// ============================================================================

/**
 * Get cached score for a photo
 */
export async function getCachedPhotoScore(assetId: string): Promise<PhotoScore | null> {
    const row = await getDb().getFirstAsync<PhotoCacheRow>(
        'SELECT * FROM photo_cache WHERE asset_id = ?',
        [assetId]
    );

    if (!row) return null;

    return {
        assetId: row.asset_id,
        blurScore: row.blur_score,
        brightnessScore: row.brightness_score,
        faceCount: row.face_count,
        faceScore: row.face_score,
        sceneTag: row.scene_tag as SceneTag | undefined,
        aestheticScore: row.aesthetic_score ?? undefined,
        cachedAt: row.cached_at,
    };
}

/**
 * Get cached scores for multiple photos
 */
export async function getCachedPhotoScores(assetIds: string[]): Promise<Map<string, PhotoScore>> {
    const placeholders = assetIds.map(() => '?').join(',');
    const rows = await getDb().getAllAsync<PhotoCacheRow>(
        `SELECT * FROM photo_cache WHERE asset_id IN (${placeholders})`,
        assetIds
    );

    const scoreMap = new Map<string, PhotoScore>();
    for (const row of rows) {
        scoreMap.set(row.asset_id, {
            assetId: row.asset_id,
            blurScore: row.blur_score,
            brightnessScore: row.brightness_score,
            faceCount: row.face_count,
            faceScore: row.face_score,
            sceneTag: row.scene_tag as SceneTag | undefined,
            aestheticScore: row.aesthetic_score ?? undefined,
            cachedAt: row.cached_at,
        });
    }

    return scoreMap;
}

/**
 * Save photo score to cache
 */
export async function savePhotoScore(score: PhotoScore): Promise<void> {
    await getDb().runAsync(
        `INSERT OR REPLACE INTO photo_cache 
      (asset_id, blur_score, brightness_score, face_count, face_score, scene_tag, aesthetic_score, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            score.assetId,
            score.blurScore,
            score.brightnessScore,
            score.faceCount,
            score.faceScore,
            score.sceneTag ?? null,
            score.aestheticScore ?? null,
            score.cachedAt,
        ]
    );
}

/**
 * Save multiple photo scores
 */
export async function savePhotoScores(scores: PhotoScore[]): Promise<void> {
    const database = getDb();

    await database.withTransactionAsync(async () => {
        for (const score of scores) {
            await database.runAsync(
                `INSERT OR REPLACE INTO photo_cache 
          (asset_id, blur_score, brightness_score, face_count, face_score, scene_tag, aesthetic_score, cached_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    score.assetId,
                    score.blurScore,
                    score.brightnessScore,
                    score.faceCount,
                    score.faceScore,
                    score.sceneTag ?? null,
                    score.aestheticScore ?? null,
                    score.cachedAt,
                ]
            );
        }
    });
}

// ============================================================================
// DUMP OPERATIONS
// ============================================================================

/**
 * Save a dump to local storage
 */
export async function saveDump(dump: Dump): Promise<void> {
    await getDb().runAsync(
        `INSERT OR REPLACE INTO dumps 
      (id, type, title, start_date, end_date, selected_assets, ordering, preset, caption, is_viewed, is_exported, exported_at, synced, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            dump.id,
            dump.type,
            dump.title,
            dump.startDate,
            dump.endDate,
            JSON.stringify(dump.selectedAssetIds),
            JSON.stringify(dump.ordering),
            dump.preset ?? null,
            dump.caption ?? null,
            dump.isViewed ? 1 : 0,
            dump.isExported ? 1 : 0,
            dump.exportedAt ?? null,
            dump.synced ? 1 : 0,
            dump.createdAt,
        ]
    );
}

/**
 * Get a dump by ID
 */
export async function getDump(id: string): Promise<Dump | null> {
    const row = await getDb().getFirstAsync<DumpRow>(
        'SELECT * FROM dumps WHERE id = ?',
        [id]
    );

    if (!row) return null;

    return rowToDump(row);
}

/**
 * Get all dumps
 */
export async function getAllDumps(): Promise<Dump[]> {
    const rows = await getDb().getAllAsync<DumpRow>(
        'SELECT * FROM dumps ORDER BY created_at DESC'
    );

    return rows.map(rowToDump);
}

/**
 * Get dumps by type
 */
export async function getDumpsByType(type: string): Promise<Dump[]> {
    const rows = await getDb().getAllAsync<DumpRow>(
        'SELECT * FROM dumps WHERE type = ? ORDER BY created_at DESC',
        [type]
    );

    return rows.map(rowToDump);
}

/**
 * Get unviewed dumps
 */
export async function getUnviewedDumps(): Promise<Dump[]> {
    const rows = await getDb().getAllAsync<DumpRow>(
        'SELECT * FROM dumps WHERE is_viewed = 0 ORDER BY created_at DESC'
    );

    return rows.map(rowToDump);
}

/**
 * Mark dump as viewed
 */
export async function markDumpAsViewed(id: string): Promise<void> {
    await getDb().runAsync(
        'UPDATE dumps SET is_viewed = 1 WHERE id = ?',
        [id]
    );
}

/**
 * Mark dump as exported
 */
export async function markDumpAsExported(id: string): Promise<void> {
    await getDb().runAsync(
        'UPDATE dumps SET is_exported = 1, exported_at = ? WHERE id = ?',
        [Date.now(), id]
    );
}

/**
 * Update dump sync status
 */
export async function updateDumpSyncStatus(id: string, synced: boolean): Promise<void> {
    await getDb().runAsync(
        'UPDATE dumps SET synced = ? WHERE id = ?',
        [synced ? 1 : 0, id]
    );
}

/**
 * Delete a dump
 */
export async function deleteDump(id: string): Promise<void> {
    await getDb().runAsync('DELETE FROM dumps WHERE id = ?', [id]);
}

/**
 * Helper: Convert database row to Dump object
 */
function rowToDump(row: DumpRow): Dump {
    return {
        id: row.id,
        type: row.type as Dump['type'],
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        selectedAssetIds: JSON.parse(row.selected_assets),
        ordering: JSON.parse(row.ordering),
        preset: row.preset ?? undefined,
        caption: row.caption ?? undefined,
        isViewed: row.is_viewed === 1,
        isExported: row.is_exported === 1,
        exportedAt: row.exported_at ?? undefined,
        synced: row.synced === 1,
        createdAt: row.created_at,
    };
}
