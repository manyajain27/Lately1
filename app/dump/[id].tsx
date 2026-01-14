/**
 * Dump Detail Screen
 * View and re-export a saved dump
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';
import { getDump, markDumpAsViewed } from '../../services/database';
import { exportDump, getExportOptions } from '../../services/export';
import { Dump, PhotoMeta } from '../../types';

// Format date for display
function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Format dump title
function formatDumpTitle(dump: Dump): string {
    if (dump.title) return dump.title;

    const start = new Date(dump.startDate);
    const end = new Date(dump.endDate);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    if (dump.type === 'weekly') {
        return `week of ${months[start.getMonth()]} ${start.getDate()}`;
    }
    if (dump.type === 'monthly') {
        const fullMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        return fullMonths[start.getMonth()];
    }
    return `${months[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
}

export default function DumpDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();

    const [dump, setDump] = useState<Dump | null>(null);
    const [photos, setPhotos] = useState<PhotoMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Load dump data
    const loadDump = useCallback(async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            const dumpData = await getDump(id);

            if (dumpData) {
                setDump(dumpData);

                // Mark as viewed
                if (!dumpData.isViewed) {
                    await markDumpAsViewed(id);
                }

                // Try to fetch photos from library by asset ID
                const photoMetas: PhotoMeta[] = [];
                for (const assetId of dumpData.selectedAssetIds.slice(0, 20)) {
                    try {
                        const asset = await MediaLibrary.getAssetInfoAsync(assetId);
                        if (asset) {
                            photoMetas.push({
                                assetId: asset.id,
                                uri: asset.uri,
                                timestamp: asset.creationTime,
                                width: asset.width,
                                height: asset.height,
                                mediaType: asset.mediaType as 'photo' | 'video',
                                isScreenshot: false,
                            });
                        }
                    } catch (e) {
                        // Photo no longer available
                        console.warn(`Photo ${assetId} not found`);
                    }
                }
                setPhotos(photoMetas);
            }
        } catch (e) {
            console.error('[DumpDetail] Error loading dump:', e);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDump();
    }, [loadDump]);

    const handleBack = () => {
        router.back();
    };

    const handleExport = async () => {
        if (!dump || photos.length === 0) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsExporting(true);

        try {
            const isPro = user?.isPro || false;
            const options = getExportOptions(isPro, false);

            const result = await exportDump(photos, dump.id, options);

            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    'exported! 🎉',
                    `${result.photoCount} photos saved to "${result.albumName}"`,
                    [{ text: 'done' }]
                );
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error('[DumpDetail] Export error:', e);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Export Failed', e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleShare = async () => {
        // TODO: Implement share functionality
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Coming Soon', 'Share functionality will be available soon!');
    };

    if (isLoading) {
        return (
            <GradientBackground>
                <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                    <ActivityIndicator color={colors.accent} size="large" />
                    <Text variant="bodyS" color="secondary" style={{ marginTop: spacing.md }}>
                        loading dump...
                    </Text>
                </View>
            </GradientBackground>
        );
    }

    if (!dump) {
        return (
            <GradientBackground>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <Pressable onPress={handleBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                        </Pressable>
                    </View>
                    <View style={[styles.container, styles.centered]}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
                        <Text variant="bodyL" color="secondary" style={{ marginTop: spacing.md }}>
                            dump not found
                        </Text>
                    </View>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <View style={styles.headerTitle}>
                        <Text variant="titleM">{formatDumpTitle(dump)}</Text>
                        <Text variant="caption" color="tertiary">
                            {dump.selectedAssetIds.length} photos
                        </Text>
                    </View>
                    <Pressable style={styles.shareButton} onPress={handleShare}>
                        <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Photo Grid */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.photoGrid}>
                        {photos.length === 0 ? (
                            <View style={styles.missingPhotos}>
                                <Ionicons name="images-outline" size={48} color={colors.textTertiary} />
                                <Text variant="bodyS" color="tertiary" style={styles.missingText}>
                                    photos not available on this device
                                </Text>
                                <Text variant="caption" color="tertiary" style={styles.missingHint}>
                                    they may have been deleted or this is a different device
                                </Text>
                            </View>
                        ) : (
                            photos.map((photo, index) => (
                                <Pressable key={photo.assetId} style={styles.photoContainer}>
                                    <GlassView style={styles.photoCard} glassEffectStyle='clear'>
                                        <Image
                                            source={{ uri: photo.uri }}
                                            style={StyleSheet.absoluteFill}
                                            contentFit="cover"
                                        />
                                        <View style={styles.photoIndex}>
                                            <Text variant="caption" color="primary">
                                                {index + 1}
                                            </Text>
                                        </View>
                                    </GlassView>
                                </Pressable>
                            ))
                        )}
                    </View>

                    {/* Info */}
                    <GlassView style={styles.infoCard} isInteractive glassEffectStyle='clear'>
                        <View style={styles.infoRow}>
                            <Text variant="bodyS" color="tertiary">created</Text>
                            <Text variant="bodyS">{formatDate(dump.createdAt)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text variant="bodyS" color="tertiary">exported</Text>
                            <Text variant="bodyS" color={dump.isExported ? 'primary' : 'accent'}>
                                {dump.isExported && dump.exportedAt
                                    ? formatDate(dump.exportedAt)
                                    : 'not yet'}
                            </Text>
                        </View>
                        {dump.caption && (
                            <View style={[styles.infoRow, { marginTop: spacing.sm }]}>
                                <Text variant="bodyS" color="secondary">"{dump.caption}"</Text>
                            </View>
                        )}
                    </GlassView>
                </ScrollView>

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <Button
                        title={isExporting ? 'exporting...' : dump.isExported ? 're-export' : 'export to photos'}
                        onPress={handleExport}
                        loading={isExporting}
                        disabled={photos.length === 0}
                    />
                </View>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        flex: 1,
    },
    shareButton: {
        padding: spacing.xs,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    photoContainer: {
        width: '31.5%',
    },
    photoCard: {
        aspectRatio: 1,
        borderRadius: radius.sm,
        overflow: 'hidden',
        position: 'relative',
    },
    photoIndex: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
    photoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface0,
        borderRadius: radius.md,
    },
    missingPhotos: {
        width: '100%',
        padding: spacing['3xl'],
        alignItems: 'center',
    },
    missingText: {
        marginTop: spacing.md,
        textAlign: 'center',
    },
    missingHint: {
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    infoCard: {
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderRadius: radius.lg,
        overflow: 'hidden',
        gap: spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        gap: spacing.md,
    },
    secondaryButton: {
        flex: 1,
    },
});
