/**
 * Home Screen
 * 
 * Main app screen with recent dumps and create CTA
 * Matches the design reference aesthetic
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolate,
    FadeIn,
    FadeInDown,
    FadeInUp,
    interpolate,
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';
import { getAllDumps, getUnviewedDumps } from '../../services/database';
import { PhotosService } from '../../services/photos';
import { Dump } from '../../types';

// UI Constants
const LETTERS = ['L', 'A', 'T', 'E', 'L', 'Y'];
const TRIGGER_HEIGHT = 140;

// Get current week date range
function getCurrentWeekRange(): { start: string; end: string } {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { start: format(weekAgo), end: format(now) };
}

/**
 * Haptic helpers at module scope to avoid closure capture errors
 */
const triggerMediumImpact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

const triggerLightImpact = () => {
    Haptics.selectionAsync();
};

/**
 * Animated Letter component (Stable, follows Rule of Hooks)
 */
const RefreshLetter = memo(({
    letter,
    index,
    scrollY
}: {
    letter: string;
    index: number;
    scrollY: SharedValue<number>;
}) => {
    const progressInput = -index * 15 - 40;

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [progressInput, progressInput + 30],
            [0.2, 0], // Max opacity 0.2 matches footer watermark style
            Extrapolate.CLAMP
        );
        const translateY = interpolate(
            scrollY.value,
            [progressInput, progressInput + 30],
            [0, 20],
            Extrapolate.CLAMP
        );
        const scale = interpolate(
            scrollY.value,
            [progressInput, progressInput + 30],
            [1, 0.5],
            Extrapolate.CLAMP
        );

        return {
            opacity,
            transform: [{ translateY }, { scale }]
        };
    });

    return (
        <Animated.Text style={[styles.refreshLetter, animatedStyle]}>
            {letter}
        </Animated.Text>
    );
});

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();

    // Shared values for interaction
    const scrollY = useSharedValue(0);
    const hapticSignal = useSharedValue(0);
    const refreshSignal = useSharedValue(0);

    // State
    const [refreshing, setRefreshing] = useState(false);
    const [unviewedDumps, setUnviewedDumps] = useState<Dump[]>([]);
    const [recentDumps, setRecentDumps] = useState<Dump[]>([]);
    const [photoCount, setPhotoCount] = useState(0);

    const displayName = user?.email?.split('@')[0] || 'friend';
    const weekRange = getCurrentWeekRange();

    const loadData = useCallback(async () => {
        try {
            const [unviewed, all] = await Promise.all([
                getUnviewedDumps(),
                getAllDumps(),
            ]);

            setUnviewedDumps(unviewed);
            setRecentDumps(all.slice(0, 5));

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);

            const photos = await PhotosService.getPhotosInDateRange(startDate, endDate);
            setPhotoCount(photos.length);
        } catch (e) {
            console.error('[Home] Error loading data:', e);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [loadData]);

    // Pull-to-refresh haptic tick
    useAnimatedReaction(
        () => scrollY.value,
        (y, prevY) => {
            if (y >= 0 || refreshing) return;
            const progress = Math.abs(y) / (TRIGGER_HEIGHT * 0.8);
            const activeIndex = Math.floor(progress * LETTERS.length);
            const prevProgress = Math.abs(prevY || 0) / (TRIGGER_HEIGHT * 0.8);
            const prevIndex = Math.floor(prevProgress * LETTERS.length);

            if (activeIndex !== prevIndex && activeIndex >= 0 && activeIndex < LETTERS.length) {
                runOnJS(triggerLightImpact)();
            }
        },
        [refreshing]
    );

    // Signals for JS effects from the worklet
    useAnimatedReaction(
        () => hapticSignal.value,
        (val) => {
            if (val === 1) {
                hapticSignal.value = 0;
                runOnJS(triggerMediumImpact)();
            }
        }
    );

    useAnimatedReaction(
        () => refreshSignal.value,
        (val) => {
            if (val === 1) {
                refreshSignal.value = 0;
                runOnJS(onRefresh)();
            }
        },
        [onRefresh]
    );

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
        onEndDrag: () => {
            if (scrollY.value <= -TRIGGER_HEIGHT && !refreshing) {
                hapticSignal.value = 1;
                refreshSignal.value = 1;
            }
        }
    });

    const handleCreateDump = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/create');
    };

    const handleOpenSettings = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/profile');
    };

    return (
        <GradientBackground style={styles.screen}>
            {/* Custom Refresh Header (Behind content) */}
            <View style={[styles.refreshHeader, { top: insets.top + 10 }]}>
                <View style={styles.lettersRow}>
                    {LETTERS.map((letter, index) => (
                        <RefreshLetter
                            key={index}
                            letter={letter}
                            index={index}
                            scrollY={scrollY}
                        />
                    ))}
                </View>
            </View>

            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={{
                    paddingTop: insets.top + spacing.xl,
                    paddingHorizontal: spacing.xl,
                    paddingBottom: 120,
                }}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                bounces={true}
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInDown.delay(100).duration(400)}
                    style={styles.header}
                >
                    <View>
                        <Text variant="titleL">
                            sup, {displayName.toLowerCase()} 👋
                        </Text>
                        <Text variant="bodyS" color="secondary" style={styles.subtitle}>
                            {weekRange.start} - {weekRange.end}
                        </Text>
                    </View>
                    <Pressable onPress={handleOpenSettings}>
                        <View style={styles.profileButton}>
                            <Ionicons name="person" size={20} color={colors.textPrimary} />
                        </View>
                    </Pressable>
                </Animated.View>

                {/* Quick Create Card */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                    <Pressable onPress={handleCreateDump}>
                        <GlassView style={styles.createCard} isInteractive glassEffectStyle="clear">
                            <View style={styles.createCardContent}>
                                <View style={styles.createCardText}>
                                    <Text variant="titleM">
                                        ready to dump? 📸
                                    </Text>
                                    <Text variant="bodyS" color="secondary" style={styles.createCardSubtext}>
                                        {photoCount > 0
                                            ? `we found ${photoCount} photos from this week`
                                            : 'create your next photo dump'}
                                    </Text>
                                </View>
                                <View style={styles.createCardButton}>
                                    <Ionicons name="add" size={24} color={colors.bg} />
                                </View>
                            </View>
                        </GlassView>
                    </Pressable>
                </Animated.View>

                {/* Your Dumps Section */}
                <Animated.View
                    entering={FadeIn.delay(400).duration(400)}
                    style={styles.section}
                >
                    <View style={styles.sectionHeader}>
                        <Text variant="titleM">your dumps</Text>
                        {unviewedDumps.length > 0 && (
                            <View style={styles.badge}>
                                <Text variant="caption" style={styles.badgeText}>
                                    {unviewedDumps.length} new
                                </Text>
                            </View>
                        )}
                    </View>

                    {recentDumps.length === 0 ? (
                        <EmptyState onCreatePress={handleCreateDump} />
                    ) : (
                        <View style={styles.dumpsGrid}>
                            {recentDumps.map((dump) => (
                                <DumpItem
                                    key={dump.id}
                                    dump={dump}
                                    onPress={() => router.push(`/dump/${dump.id}`)}
                                />
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* Stats Card */}
                <Animated.View entering={FadeInUp.delay(500).duration(400)}>
                    <GlassView style={styles.statsCard} isInteractive glassEffectStyle="clear">
                        <Text variant="caption" color="tertiary" style={styles.statsLabel}>
                            THIS WEEK
                        </Text>
                        <View style={styles.statsRow}>
                            <StatItem label="photos" value={String(photoCount)} emoji="📷" />
                            <StatItem label="days" value="7" emoji="📅" />
                            <StatItem label="vibes" value="✨" emoji="" isEmoji />
                        </View>
                    </GlassView>
                </Animated.View>

                <View style={{ height: 120 }} />
            </Animated.ScrollView>
        </GradientBackground>
    );
}

// Sub-components
function EmptyState({ onCreatePress }: { onCreatePress: () => void }) {
    return (
        <View style={styles.emptyState}>
            <Text variant="titleL" style={styles.emptyEmoji}>🌟</Text>
            <Text variant="bodyM" color="secondary">no dumps yet</Text>
            <Text variant="bodyS" color="tertiary" style={styles.emptySubtext}>
                create your first photo dump and{'\n'}it'll show up here
            </Text>
            <Button
                title="create first dump"
                onPress={onCreatePress}
                variant="secondary"
                style={styles.emptyButton}
            />
        </View>
    );
}

function DumpItem({ dump, onPress }: { dump: Dump; onPress: () => void }) {
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <Pressable onPress={onPress}>
            <GlassView style={styles.dumpItem} isInteractive glassEffectStyle="clear">
                <View style={styles.dumpInfo}>
                    <Text variant="bodyM">
                        {dump.title || `${formatDate(dump.startDate)} - ${formatDate(dump.endDate)}`}
                    </Text>
                    <Text variant="caption" color="tertiary">
                        {dump.selectedAssetIds.length} photos • {dump.isExported ? 'exported' : 'not exported'}
                    </Text>
                </View>
                {!dump.isViewed && <View style={styles.newDot} />}
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </GlassView>
        </Pressable>
    );
}

function StatItem({ label, value, emoji, isEmoji = false }: { label: string; value: string; emoji: string; isEmoji?: boolean; }) {
    return (
        <View style={styles.statItem}>
            <Text variant="titleL">{value} {!isEmoji && emoji}</Text>
            <Text variant="caption" color="tertiary">{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scrollView: { flex: 1 },
    refreshHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
    },
    lettersRow: { flexDirection: 'row', gap: 2 },
    refreshLetter: {
        fontSize: 52,
        fontWeight: '900',
        color: colors.accent,
        letterSpacing: -2,
    },
    header: {
        marginBottom: spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtitle: { marginTop: spacing.xs },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createCard: {
        marginBottom: spacing.xl,
        borderRadius: radius.xl,
        padding: spacing.lg,
        overflow: 'hidden',
    },
    createCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    createCardText: { flex: 1 },
    createCardSubtext: { marginTop: spacing.xs },
    createCardButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.md,
    },
    section: { marginBottom: spacing.xl },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    badge: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
    badgeText: { color: colors.bg, fontWeight: '600' },
    dumpsGrid: { gap: spacing.sm },
    dumpItem: {
        borderRadius: radius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    dumpInfo: { flex: 1 },
    newDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent,
        marginRight: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        backgroundColor: colors.surface1,
        borderRadius: radius.xl,
    },
    emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
    emptySubtext: {
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    emptyButton: { marginTop: spacing.sm },
    statsCard: {
        marginBottom: spacing.xl,
        borderRadius: radius.xl,
        padding: spacing.lg,
        overflow: 'hidden',
    },
    statsLabel: { marginBottom: spacing.md, letterSpacing: 1 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
});
