/**
 * Sync Service
 * Syncs dump metadata to Supabase for cross-device access
 */

import { Dump } from '../types';
import { getAllDumps, updateDumpSyncStatus } from './database';
import { supabase } from './supabase';

// Supabase table name
const DUMPS_TABLE = 'dumps';

/**
 * Sync status interface
 */
export interface SyncStatus {
    isSyncing: boolean;
    lastSyncAt: number | null;
    pendingUploads: number;
    error: string | null;
}

/**
 * Convert local dump to Supabase format
 */
function toSupabaseFormat(dump: Dump, userId: string) {
    return {
        id: dump.id,
        user_id: userId,
        type: dump.type,
        title: dump.title,
        start_date: new Date(dump.startDate).toISOString(),
        end_date: new Date(dump.endDate).toISOString(),
        selected_asset_ids: dump.selectedAssetIds,
        ordering: dump.ordering,
        preset: dump.preset || null,
        caption: dump.caption || null,
        is_viewed: dump.isViewed,
        is_exported: dump.isExported,
        exported_at: dump.exportedAt ? new Date(dump.exportedAt).toISOString() : null,
        created_at: new Date(dump.createdAt).toISOString(),
    };
}

/**
 * Convert Supabase format to local dump
 */
function fromSupabaseFormat(row: Record<string, unknown>): Dump {
    return {
        id: row.id as string,
        type: row.type as Dump['type'],
        title: row.title as string,
        startDate: new Date(row.start_date as string).getTime(),
        endDate: new Date(row.end_date as string).getTime(),
        selectedAssetIds: row.selected_asset_ids as string[],
        ordering: row.ordering as number[],
        preset: row.preset as string | undefined,
        caption: row.caption as string | undefined,
        isViewed: row.is_viewed as boolean,
        isExported: row.is_exported as boolean,
        exportedAt: row.exported_at ? new Date(row.exported_at as string).getTime() : undefined,
        synced: true,
        createdAt: new Date(row.created_at as string).getTime(),
    };
}

/**
 * Upload a single dump to Supabase
 */
export async function uploadDump(dump: Dump): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('[Sync] No user logged in');
            return false;
        }

        const supabaseDump = toSupabaseFormat(dump, user.id);

        const { error } = await supabase
            .from(DUMPS_TABLE)
            .upsert(supabaseDump, { onConflict: 'id' });

        if (error) {
            console.error('[Sync] Upload error:', error);
            return false;
        }

        // Mark as synced in local DB
        await updateDumpSyncStatus(dump.id, true);
        console.log(`[Sync] Uploaded dump ${dump.id}`);
        return true;
    } catch (e) {
        console.error('[Sync] Upload failed:', e);
        return false;
    }
}

/**
 * Sync all unsynced dumps to cloud
 */
export async function syncAllDumps(): Promise<{
    success: number;
    failed: number;
}> {
    const allDumps = await getAllDumps();
    const unsynced = allDumps.filter(d => !d.synced);

    let success = 0;
    let failed = 0;

    for (const dump of unsynced) {
        const uploaded = await uploadDump(dump);
        if (uploaded) {
            success++;
        } else {
            failed++;
        }
    }

    console.log(`[Sync] Completed: ${success} success, ${failed} failed`);
    return { success, failed };
}

/**
 * Fetch dumps from cloud
 */
export async function fetchCloudDumps(): Promise<Dump[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('[Sync] No user logged in');
            return [];
        }

        const { data, error } = await supabase
            .from(DUMPS_TABLE)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Sync] Fetch error:', error);
            return [];
        }

        return (data || []).map(fromSupabaseFormat);
    } catch (e) {
        console.error('[Sync] Fetch failed:', e);
        return [];
    }
}

/**
 * Delete dump from cloud
 */
export async function deleteCloudDump(dumpId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from(DUMPS_TABLE)
            .delete()
            .eq('id', dumpId);

        if (error) {
            console.error('[Sync] Delete error:', error);
            return false;
        }

        console.log(`[Sync] Deleted cloud dump ${dumpId}`);
        return true;
    } catch (e) {
        console.error('[Sync] Delete failed:', e);
        return false;
    }
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
    try {
        const allDumps = await getAllDumps();
        const unsynced = allDumps.filter(d => !d.synced);

        return {
            isSyncing: false,
            lastSyncAt: null, // TODO: Store last sync time
            pendingUploads: unsynced.length,
            error: null,
        };
    } catch (e) {
        return {
            isSyncing: false,
            lastSyncAt: null,
            pendingUploads: 0,
            error: e instanceof Error ? e.message : 'Unknown error',
        };
    }
}
