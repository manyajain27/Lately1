/**
 * Memories Screen
 * 
 * Gallery/archives of past dumps grouped by type
 * Matches the design reference aesthetic
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { getAllDumps, getDumpsByType } from '../../services/database';
import { Dump, DumpType } from '../../types';

// Format date range for display
function formatDateRange(startDate: number, endDate: number, type: DumpType): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const fullMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    if (type === 'monthly') {
        return `${fullMonths[start.getMonth()]} '${start.getFullYear().toString().slice(-2)}`;
    }

    if (type === 'yearly') {
        return `${start.getFullYear()}`;
    }

    if (start.getMonth() === end.getMonth()) {
        return `${months[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
    }
    return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
}

export default function MemoriesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [weeklyDumps, setWeeklyDumps] = useState<Dump[]>([]);
    const [monthlyDumps, setMonthlyDumps] = useState<Dump[]>([]);
    const [tripDumps, setTripDumps] = useState<Dump[]>([]);
    const [totalDumps, setTotalDumps] = useState(0);
    const [totalPhotos, setTotalPhotos] = useState(0);

    const loadData = useCallback(async () => {
        try {
            const [weekly, monthly, trips, all] = await Promise.all([
                getDumpsByType('weekly'),
                getDumpsByType('monthly'),
                getDumpsByType('trip'),
                getAllDumps(),
            ]);

            setWeeklyDumps(weekly);
            setMonthlyDumps(monthly);
            setTripDumps(trips);
            setTotalDumps(all.length);
            setTotalPhotos(all.reduce((sum, d) => sum + d.selectedAssetIds.length, 0));
        } catch (e) {
            console.error('[Memories] Error loading dumps:', e);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const handleDumpPress = (dump: Dump) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/dump/${dump.id}`);
    };

    const handleCreateDump = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/create');
    };

    const hasAnyDumps = weeklyDumps.length + monthlyDumps.length + tripDumps.length > 0;

    return (
        <GradientBackground style={styles.screen}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + spacing.xl }
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accent}
                    />
                }
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInDown.delay(100).duration(400)}
                    style={styles.header}
                >
                    <Text variant="titleXL">memories</Text>
                </Animated.View>

                {/* Stats */}
                {hasAnyDumps && (
                    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                        <GlassView style={styles.statsCard} isInteractive glassEffectStyle="clear">
                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text variant="titleL">{totalDumps}</Text>
                                    <Text variant="caption" color="tertiary">dumps</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text variant="titleL">{totalPhotos}</Text>
                                    <Text variant="caption" color="tertiary">photos</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text variant="titleL">✨</Text>
                                    <Text variant="caption" color="tertiary">vibes</Text>
                                </View>
                            </View>
                        </GlassView>
                    </Animated.View>
                )}

                {!hasAnyDumps ? (
                    <Animated.View
                        entering={FadeIn.delay(300).duration(400)}
                        style={styles.emptyContainer}
                    >
                        <GlassView style={styles.emptyCard} isInteractive glassEffectStyle="clear">
                            <Text variant="titleL" style={styles.emptyEmoji}>🌟</Text>
                            <Text variant="bodyL" color="secondary">no memories yet</Text>
                            <Text variant="bodyS" color="tertiary" style={styles.emptyText}>
                                create your first photo dump and{'\n'}it'll show up here
                            </Text>
                            <Button
                                title="create first dump"
                                onPress={handleCreateDump}
                                variant="secondary"
                                style={styles.emptyButton}
                            />
                        </GlassView>
                    </Animated.View>
                ) : (
                    <>
                        {/* Weekly Dumps */}
                        {weeklyDumps.length > 0 && (
                            <Animated.View
                                entering={FadeIn.delay(300).duration(400)}
                                style={styles.section}
                            >
                                <View style={styles.sectionHeader}>
                                    <Text variant="titleM">weekly dumps</Text>
                                    <View style={styles.countBadge}>
                                        <Text variant="caption" color="tertiary">{weeklyDumps.length}</Text>
                                    </View>
                                </View>
                                {weeklyDumps.slice(0, 4).map((dump, index) => (
                                    <DumpCard
                                        key={dump.id}
                                        dump={dump}
                                        onPress={() => handleDumpPress(dump)}
                                        delay={index * 50}
                                    />
                                ))}
                                {weeklyDumps.length > 4 && (
                                    <Text variant="caption" color="accent" style={styles.viewMore}>
                                        + {weeklyDumps.length - 4} more
                                    </Text>
                                )}
                            </Animated.View>
                        )}

                        {/* Monthly Dumps */}
                        {monthlyDumps.length > 0 && (
                            <Animated.View
                                entering={FadeIn.delay(400).duration(400)}
                                style={styles.section}
                            >
                                <View style={styles.sectionHeader}>
                                    <Text variant="titleM">monthly dumps</Text>
                                    <View style={styles.countBadge}>
                                        <Text variant="caption" color="tertiary">{monthlyDumps.length}</Text>
                                    </View>
                                </View>
                                {monthlyDumps.slice(0, 3).map((dump, index) => (
                                    <DumpCard
                                        key={dump.id}
                                        dump={dump}
                                        onPress={() => handleDumpPress(dump)}
                                        delay={index * 50}
                                    />
                                ))}
                            </Animated.View>
                        )}

                        {/* Trips */}
                        {tripDumps.length > 0 && (
                            <Animated.View
                                entering={FadeInUp.delay(500).duration(400)}
                                style={styles.section}
                            >
                                <View style={styles.sectionHeader}>
                                    <Text variant="titleM">trips ✈️</Text>
                                    <View style={styles.countBadge}>
                                        <Text variant="caption" color="tertiary">{tripDumps.length}</Text>
                                    </View>
                                </View>
                                {tripDumps.map((dump, index) => (
                                    <DumpCard
                                        key={dump.id}
                                        dump={dump}
                                        onPress={() => handleDumpPress(dump)}
                                        delay={index * 50}
                                    />
                                ))}
                            </Animated.View>
                        )}
                    </>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
        </GradientBackground>
    );
}

// Dump card component
function DumpCard({
    dump,
    onPress,
    delay = 0
}: {
    dump: Dump;
    onPress: () => void;
    delay?: number;
}) {
    const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

    // Try to load thumbnail
    useEffect(() => {
        async function loadThumbnail() {
            if (dump.selectedAssetIds.length > 0) {
                try {
                    const asset = await MediaLibrary.getAssetInfoAsync(dump.selectedAssetIds[0]);
                    if (asset) {
                        setThumbnailUri(asset.uri);
                    }
                } catch (e) {
                    // Photo not available
                }
            }
        }
        loadThumbnail();
    }, [dump.selectedAssetIds]);

    return (
        <Pressable onPress={onPress}>
            <GlassView style={styles.dumpCard} isInteractive glassEffectStyle="clear">
                {/* Thumbnail */}
                <View style={styles.thumbnail}>
                    {thumbnailUri ? (
                        <Image
                            source={{ uri: thumbnailUri }}
                            style={styles.thumbnailImage}
                            contentFit="cover"
                        />
                    ) : (
                        <Ionicons name="images-outline" size={20} color={colors.textTertiary} />
                    )}
                </View>

                {/* Info */}
                <View style={styles.dumpInfo}>
                    <Text variant="bodyM">
                        {dump.title || formatDateRange(dump.startDate, dump.endDate, dump.type)}
                    </Text>
                    <Text variant="caption" color="tertiary">
                        {dump.selectedAssetIds.length} photos • {dump.isExported ? 'exported' : 'ready'}
                    </Text>
                </View>

                {/* New indicator */}
                {!dump.isViewed && <View style={styles.newDot} />}

                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </GlassView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    statsCard: {
        marginBottom: spacing.xl,
        borderRadius: radius.xl,
        padding: spacing.lg,
        overflow: 'hidden',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    stat: {
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.borderSoft,
    },
    emptyContainer: {
        paddingTop: spacing['3xl'],
    },
    emptyCard: {
        padding: spacing['3xl'],
        alignItems: 'center',
        gap: spacing.md,
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    emptyEmoji: {
        fontSize: 48,
    },
    emptyText: {
        textAlign: 'center',
    },
    emptyButton: {
        marginTop: spacing.md,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    countBadge: {
        backgroundColor: colors.surface1,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
    dumpCard: {
        borderRadius: radius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        overflow: 'hidden',
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        backgroundColor: colors.surface1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginRight: spacing.md,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    dumpInfo: {
        flex: 1,
    },
    newDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent,
        marginRight: spacing.sm,
    },
    viewMore: {
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});
