import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { PhotoMeta } from '../../types';

interface ScoredPhotoDisplay {
    photo: PhotoMeta;
    score: number;
    faceCount: number;
    isShortlisted: boolean;
}

export default function ScorePreviewScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { shortlistedJson, allScoredJson } = useLocalSearchParams<{
        shortlistedJson: string;
        allScoredJson: string;
    }>();

    const [shortlisted, setShortlisted] = useState<ScoredPhotoDisplay[]>([]);
    const [notShortlisted, setNotShortlisted] = useState<ScoredPhotoDisplay[]>([]);
    const [activeTab, setActiveTab] = useState<'shortlisted' | 'others'>('shortlisted');
    const hasLoaded = useRef(false);

    useEffect(() => {
        // Only load once
        if (hasLoaded.current) return;
        if (!shortlistedJson || !allScoredJson) return;

        hasLoaded.current = true;

        try {
            const shortlistedData = JSON.parse(shortlistedJson);
            const allScoredData = JSON.parse(allScoredJson);

            const shortlistedIds = new Set(shortlistedData.map((p: any) => p.assetId));

            const shortlistedPhotos: ScoredPhotoDisplay[] = shortlistedData.map((p: any) => ({
                photo: p,
                score: p.aestheticScore || 0,
                faceCount: p.faceCount || 0,
                isShortlisted: true,
            }));

            const otherPhotos: ScoredPhotoDisplay[] = allScoredData
                .filter((p: any) => !shortlistedIds.has(p.assetId))
                .map((p: any) => ({
                    photo: p,
                    score: p.aestheticScore || 0,
                    faceCount: p.faceCount || 0,
                    isShortlisted: false,
                }));

            setShortlisted(shortlistedPhotos.sort((a, b) => b.score - a.score));
            setNotShortlisted(otherPhotos.sort((a, b) => b.score - a.score));
        } catch (e) {
            console.error('[ScorePreview] Error parsing data:', e);
        }
    }, [shortlistedJson, allScoredJson]);

    const getScoreColor = (score: number) => {
        if (score > 0.3) return '#22c55e';
        if (score > 0) return '#eab308';
        if (score > -0.3) return '#f97316';
        return '#ef4444';
    };



    const currentData = activeTab === 'shortlisted' ? shortlisted : notShortlisted;

    return (
        <GradientBackground>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text variant="titleL">score preview</Text>
                    <Text variant="bodyS" color="tertiary">
                        {shortlisted.length} shortlisted • {notShortlisted.length} others
                    </Text>
                </View>
                <Pressable onPress={() => router.back()} style={styles.continueButton}>
                    <Text style={{ color: 'black', fontWeight: '600' }}>continue</Text>
                </Pressable>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'shortlisted' && styles.tabActive]}
                    onPress={() => setActiveTab('shortlisted')}
                >
                    <Text style={[styles.tabText, activeTab === 'shortlisted' && styles.tabTextActive]}>
                        ✅ Shortlisted ({shortlisted.length})
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'others' && styles.tabActive]}
                    onPress={() => setActiveTab('others')}
                >
                    <Text style={[styles.tabText, activeTab === 'others' && styles.tabTextActive]}>
                        📋 Not Shortlisted ({notShortlisted.length})
                    </Text>
                </Pressable>
            </View>

            {/* Score Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                    <Text variant="caption" color="tertiary">&gt;0.3 High</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
                    <Text variant="caption" color="tertiary">0-0.3</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
                    <Text variant="caption" color="tertiary">-0.3-0</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text variant="caption" color="tertiary">&lt;-0.3</Text>
                </View>
            </View>

            {/* Photo Grid */}
            <FlatList
                data={currentData}
                renderItem={({ item }) => <ScoreCard item={item} />}
                keyExtractor={item => item.photo.assetId}
                numColumns={3}
                contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            />
        </GradientBackground>
    );
}

function ScoreCard({ item }: { item: ScoredPhotoDisplay }) {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const p = item.photo as any;

    // Calculate display values
    const faceBonus = (p.faceCount > 0 ? 0.05 : 0) + (p.faceCount > 2 ? 0.05 : 0);
    const favBonus = p.isFavorite ? 5.0 : 0;
    const finalScore = p.finalScore || item.score; // Fallback

    const getScoreColor = (score: number) => {
        if (score > 0.3) return '#22c55e';
        if (score > 0) return '#eab308';
        if (score > -0.3) return '#f97316';
        return '#ef4444';
    };

    return (
        <Pressable style={styles.photoCard} onPress={() => setShowBreakdown(!showBreakdown)}>
            <Image
                source={{ uri: item.photo.uri }}
                style={styles.photoImage}
                contentFit="cover"
            />

            {showBreakdown ? (
                <View style={styles.overlay}>
                    <Text style={styles.overlayText}>Vision: {item.score.toFixed(2)}</Text>
                    {faceBonus > 0 && <Text style={styles.overlayText}>Faces: +{faceBonus.toFixed(2)}</Text>}
                    {favBonus > 0 && <Text style={styles.overlayText}>Fav: +5.0</Text>}
                    <View style={styles.divider} />
                    <Text style={[styles.overlayText, { fontWeight: 'bold' }]}>
                        Final: {finalScore.toFixed(2)}
                    </Text>
                </View>
            ) : (
                <View style={styles.photoInfo}>
                    <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
                        <Text style={styles.scoreText}>{item.score.toFixed(2)}</Text>
                    </View>
                    {p.isFavorite && (
                        <View style={[styles.scoreBadge, { backgroundColor: '#db2777' }]}>
                            <Ionicons name="heart" size={10} color="white" />
                        </View>
                    )}
                    {item.faceCount > 0 && (
                        <View style={styles.faceBadge}>
                            <Ionicons name="people" size={10} color="white" />
                            <Text style={styles.faceText}>{item.faceCount}</Text>
                        </View>
                    )}
                </View>
            )}
        </Pressable>
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
    continueButton: {
        backgroundColor: colors.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: radius.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    tabText: {
        color: colors.textTertiary,
        fontWeight: '500',
        fontSize: 13,
    },
    tabTextActive: {
        color: 'white',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    grid: {
        paddingHorizontal: spacing.sm,
    },
    photoCard: {
        flex: 1,
        aspectRatio: 1,
        margin: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoInfo: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        right: 4,
        flexDirection: 'row',
        gap: 4,
    },
    scoreBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    scoreText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'white',
    },
    faceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    faceText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'white',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    overlayText: {
        color: 'white',
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 2,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: '80%',
        marginVertical: 4,
    },
});
