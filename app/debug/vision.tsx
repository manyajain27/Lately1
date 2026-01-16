/**
 * Vision API Debug Tool
 * 
 * Browse photos and see all metadata + Vision API scores
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';

// Import Vision module
let VisionAesthetics: any = null;
try {
    VisionAesthetics = require('../../modules/expo-vision-aesthetics').default;
} catch (e) {
    console.warn('[VisionDebug] Vision module not available');
}

interface PhotoDebugInfo {
    asset: MediaLibrary.Asset;
    assetInfo?: MediaLibrary.AssetInfo;
    visionScore?: {
        score: number;
        isUtility: boolean;
        available: boolean;
        fallback?: boolean;
        error?: string;
    };
    faceResult?: {
        faceCount: number;
        faces: any[];
    };
    isLoading: boolean;
}

export default function VisionDebugScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [photos, setPhotos] = useState<PhotoDebugInfo[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoDebugInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [visionAvailable, setVisionAvailable] = useState(false);

    useEffect(() => {
        loadPhotos();
        checkVisionAvailability();
    }, []);

    const checkVisionAvailability = () => {
        if (Platform.OS === 'ios' && VisionAesthetics?.isAestheticsAvailable) {
            try {
                const available = VisionAesthetics.isAestheticsAvailable();
                setVisionAvailable(available);
            } catch (e) {
                setVisionAvailable(false);
            }
        }
    };

    const loadPhotos = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') return;

            const result = await MediaLibrary.getAssetsAsync({
                first: 200, // Increased for more testing
                mediaType: [MediaLibrary.MediaType.photo],
                sortBy: [MediaLibrary.SortBy.creationTime],
            });

            const photoInfos: PhotoDebugInfo[] = result.assets.map(asset => ({
                asset,
                isLoading: false,
            }));

            setPhotos(photoInfos);
        } catch (e) {
            console.error('[VisionDebug] Error loading photos:', e);
        } finally {
            setLoading(false);
        }
    };

    const analyzePhoto = async (photo: PhotoDebugInfo) => {
        // Update loading state
        setPhotos(prev => prev.map(p =>
            p.asset.id === photo.asset.id ? { ...p, isLoading: true } : p
        ));

        try {
            // Get extended asset info (localUri, exif, location)
            const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.asset.id);

            let visionScore = undefined;
            let faceResult = undefined;

            // Run Vision API if available and we have localUri
            if (Platform.OS === 'ios' && VisionAesthetics && assetInfo.localUri) {
                try {
                    visionScore = await VisionAesthetics.scoreImage(assetInfo.localUri);
                } catch (e: any) {
                    visionScore = { error: e.message, score: 0, isUtility: false, available: false };
                }

                try {
                    faceResult = await VisionAesthetics.detectFaces(assetInfo.localUri);
                } catch (e: any) {
                    faceResult = { faceCount: 0, faces: [], error: e.message };
                }
            }

            const updatedPhoto: PhotoDebugInfo = {
                ...photo,
                assetInfo,
                visionScore,
                faceResult,
                isLoading: false,
            };

            setPhotos(prev => prev.map(p =>
                p.asset.id === photo.asset.id ? updatedPhoto : p
            ));
            setSelectedPhoto(updatedPhoto);

        } catch (e: any) {
            console.error('[VisionDebug] Error analyzing photo:', e);
            setPhotos(prev => prev.map(p =>
                p.asset.id === photo.asset.id ? { ...p, isLoading: false } : p
            ));
        }
    };

    const getScoreColor = (score: number) => {
        if (score > 0.5) return '#22c55e'; // green
        if (score > 0) return '#eab308'; // yellow
        return '#ef4444'; // red
    };

    const formatLocation = (location: any) => {
        if (!location) return 'None';
        if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') return 'None';
        try {
            return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        } catch {
            return 'None';
        }
    };

    const isLikelyScreenshot = (photo: PhotoDebugInfo) => {
        const { asset, assetInfo, visionScore } = photo;

        // Check Vision API isUtility
        if (visionScore?.isUtility) return { is: true, reason: 'Vision API: isUtility = true' };

        // Check filename
        if (asset.filename?.toLowerCase().includes('screenshot')) {
            return { is: true, reason: 'Filename contains "screenshot"' };
        }

        // Check common screenshot dimensions
        const screenshotWidths = [828, 1125, 1170, 1179, 1242, 1284, 1290, 1320, 2048, 2732];
        if (screenshotWidths.includes(asset.width)) {
            return { is: true, reason: `Width ${asset.width}px matches common screenshot size` };
        }

        // Check if PNG (screenshots are usually PNG)
        if (asset.filename?.toLowerCase().endsWith('.png')) {
            return { is: true, reason: 'PNG format (common for screenshots)' };
        }

        return { is: false, reason: 'No screenshot indicators' };
    };

    const renderPhotoItem = ({ item }: { item: PhotoDebugInfo }) => (
        <Pressable
            style={styles.photoItem}
            onPress={() => analyzePhoto(item)}
        >
            <Image
                source={{ uri: item.asset.uri }}
                style={styles.thumbnail}
                contentFit="cover"
            />
            {item.isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator color="white" />
                </View>
            )}
            {item.visionScore && (
                <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.visionScore.score) }]}>
                    <Text style={styles.scoreBadgeText}>{item.visionScore.score.toFixed(2)}</Text>
                </View>
            )}
            {item.visionScore?.isUtility && (
                <View style={styles.utilityBadge}>
                    <Ionicons name="document" size={12} color="white" />
                </View>
            )}
        </Pressable>
    );

    return (
        <GradientBackground>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View>
                    <Text variant="titleL">vision debug</Text>
                    <Text variant="bodyS" color="tertiary">
                        {visionAvailable ? '✅ iOS 18 Vision Available' : '⚠️ Using Fallback'}
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                {/* Photo Grid */}
                <View style={styles.gridContainer}>
                    <Text variant="bodyS" color="tertiary" style={styles.gridLabel}>
                        Tap a photo to analyze • {photos.length} photos
                    </Text>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={photos}
                            renderItem={renderPhotoItem}
                            keyExtractor={item => item.asset.id}
                            numColumns={4}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.grid}
                        />
                    )}
                </View>

                {/* Detail Panel */}
                {selectedPhoto && (
                    <ScrollView style={styles.detailPanel} showsVerticalScrollIndicator={false}>
                        <Image
                            source={{ uri: selectedPhoto.asset.uri }}
                            style={styles.previewImage}
                            contentFit="contain"
                        />

                        <View style={styles.detailSection}>
                            <Text variant="titleM" style={styles.sectionTitle}>📋 Basic Info</Text>
                            <DetailRow label="Filename" value={selectedPhoto.asset.filename} />
                            <DetailRow label="Dimensions" value={`${selectedPhoto.asset.width} × ${selectedPhoto.asset.height}`} />
                            <DetailRow label="Created" value={new Date(selectedPhoto.asset.creationTime).toLocaleString()} />
                            <DetailRow label="Media Type" value={selectedPhoto.asset.mediaType} />
                        </View>

                        {selectedPhoto.assetInfo && (
                            <View style={styles.detailSection}>
                                <Text variant="titleM" style={styles.sectionTitle}>📁 Extended Info</Text>
                                <DetailRow label="Local URI" value={selectedPhoto.assetInfo.localUri ? '✅ Available' : '❌ Not available'} />
                                <DetailRow label="Location" value={formatLocation(selectedPhoto.assetInfo.location)} />
                                <DetailRow label="Is Favorite" value={selectedPhoto.assetInfo.isFavorite ? '⭐ Yes' : 'No'} />
                            </View>
                        )}

                        {selectedPhoto.visionScore && (
                            <View style={styles.detailSection}>
                                <Text variant="titleM" style={styles.sectionTitle}>🧠 Vision API Score</Text>
                                <DetailRow
                                    label="Aesthetic Score"
                                    value={selectedPhoto.visionScore.score.toFixed(3)}
                                    valueColor={getScoreColor(selectedPhoto.visionScore.score)}
                                />
                                <DetailRow
                                    label="Is Utility (Screenshot/Doc)"
                                    value={selectedPhoto.visionScore.isUtility ? '⚠️ YES' : '✅ No'}
                                    valueColor={selectedPhoto.visionScore.isUtility ? '#ef4444' : '#22c55e'}
                                />
                                <DetailRow label="API Available" value={selectedPhoto.visionScore.available ? 'iOS 18' : 'Fallback'} />
                                {selectedPhoto.visionScore.error && (
                                    <DetailRow label="Error" value={selectedPhoto.visionScore.error} valueColor="#ef4444" />
                                )}
                            </View>
                        )}

                        {selectedPhoto.faceResult && (
                            <View style={styles.detailSection}>
                                <Text variant="titleM" style={styles.sectionTitle}>👤 Face Detection</Text>
                                <DetailRow label="Face Count" value={String(selectedPhoto.faceResult.faceCount)} />
                            </View>
                        )}

                        <View style={styles.detailSection}>
                            <Text variant="titleM" style={styles.sectionTitle}>📸 Screenshot Detection</Text>
                            {(() => {
                                const result = isLikelyScreenshot(selectedPhoto);
                                return (
                                    <>
                                        <DetailRow
                                            label="Is Screenshot?"
                                            value={result.is ? '🚫 YES' : '✅ NO'}
                                            valueColor={result.is ? '#ef4444' : '#22c55e'}
                                        />
                                        <DetailRow label="Reason" value={result.reason} />
                                    </>
                                );
                            })()}
                        </View>

                        <View style={styles.detailSection}>
                            <Text variant="titleM" style={styles.sectionTitle}>🎯 Selection Verdict</Text>
                            {(() => {
                                const screenshot = isLikelyScreenshot(selectedPhoto);
                                const score = selectedPhoto.visionScore?.score ?? 0;
                                const faces = selectedPhoto.faceResult?.faceCount ?? 0;

                                let verdict = '';
                                let color = '#22c55e';

                                if (screenshot.is) {
                                    verdict = '❌ EXCLUDED - Screenshot/Utility';
                                    color = '#ef4444';
                                } else if (score > 0.3) {
                                    verdict = '✅ HIGH PRIORITY - Great aesthetic score';
                                    color = '#22c55e';
                                } else if (score > 0 && faces > 0) {
                                    verdict = '👍 MEDIUM - Has faces, decent score';
                                    color = '#eab308';
                                } else if (score > -0.3) {
                                    verdict = '🤔 LOW PRIORITY - Mediocre score';
                                    color = '#f97316';
                                } else {
                                    verdict = '⬇️ LIKELY EXCLUDED - Poor score';
                                    color = '#ef4444';
                                }

                                return <Text style={{ color, fontWeight: '600', fontSize: 14 }}>{verdict}</Text>;
                            })()}
                        </View>

                        <View style={{ height: insets.bottom + 20 }} />
                    </ScrollView>
                )}
            </View>
        </GradientBackground>
    );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <View style={styles.detailRow}>
            <Text variant="bodyS" color="tertiary">{label}</Text>
            <Text variant="bodyS" style={[styles.detailValue, valueColor ? { color: valueColor } : {}]} numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    backButton: {
        padding: spacing.sm,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    gridContainer: {
        width: '40%',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
    },
    gridLabel: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    grid: {
        padding: 4,
    },
    photoItem: {
        flex: 1,
        aspectRatio: 1,
        margin: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    scoreBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: 'white',
    },
    utilityBadge: {
        position: 'absolute',
        top: 2,
        left: 2,
        backgroundColor: '#ef4444',
        padding: 2,
        borderRadius: 4,
    },
    detailPanel: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
    },
    detailSection: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        marginBottom: spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    detailValue: {
        color: 'white',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        marginLeft: spacing.md,
    },
});
