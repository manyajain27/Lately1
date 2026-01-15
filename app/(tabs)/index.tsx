/**
 * Home Screen - "For You"
 * 
 * Matches reference design with REAL DATA:
 * - "For You" Header
 * - Hero Card: Shows latest dump or "Create" CTA
 * - Recent Exports: Horizontal list of past dumps with working thumbnails
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, Text } from '../../components/ui';
import { SkiaOverlay } from '../../components/ui/SkiaGradient';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';
import { getAllDumps } from '../../services/database';
import { PhotosService } from '../../services/photos';
import { Dump } from '../../types';

const LETTERS = ['L', 'A', 'T', 'E', 'L', 'Y'];
const TRIGGER_HEIGHT = 140;

// Helper to get thumbnail
function useDumpThumbnail(dump: Dump | undefined) {
    const [uri, setUri] = useState<string | null>(null);
    useEffect(() => {
        if (!dump || dump.selectedAssetIds.length === 0) return;
        let isMounted = true;
        MediaLibrary.getAssetInfoAsync(dump.selectedAssetIds[0])
            .then(asset => {
                if (isMounted) setUri(asset?.localUri || asset?.uri || null);
            })
            .catch(() => { });
        return () => { isMounted = false; };
    }, [dump]);
    return uri;
}

function getCurrentWeekRange(): string {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(weekAgo)} - ${format(now)}`;
}

const triggerMediumImpact = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
const triggerLightImpact = () => Haptics.selectionAsync();

const RefreshLetter = memo(({ letter, index, scrollY }: { letter: string; index: number; scrollY: SharedValue<number> }) => {
    const progressInput = -index * 15 - 40;
    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [progressInput, progressInput + 30], [0.2, 0], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [progressInput, progressInput + 30], [0, 20], Extrapolate.CLAMP);
        const scale = interpolate(scrollY.value, [progressInput, progressInput + 30], [1, 0.5], Extrapolate.CLAMP);
        return { opacity, transform: [{ translateY }, { scale }] };
    });
    return <Animated.Text style={[styles.refreshLetter, animatedStyle]}>{letter}</Animated.Text>;
});

const HeroCard = ({ dump, onPress }: { dump: Dump; onPress: () => void }) => {
    const thumbnailUri = useDumpThumbnail(dump);
    const dateRange = formatDate(dump.startDate); // simplified

    return (
        <Pressable onPress={onPress} activeOpacity={0.9}>
            <View style={styles.heroCard}>
                {thumbnailUri ? (
                    <Image source={{ uri: thumbnailUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface2 }]} />
                )}
                <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                    <SkiaOverlay colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                </View>

                <View style={styles.heroContent}>
                    <View style={styles.heroBadge}>
                        <Text variant="caption" style={styles.heroBadgeText}>{dump.type.toUpperCase()}</Text>
                        <Text variant="caption" color="secondary">{dateRange}</Text>
                    </View>
                    <Text variant="titleXL" style={styles.heroTitle}>{dump.title || 'untitled dump'}</Text>
                    <Text variant="bodyS" color="secondary" style={styles.heroSubtitle}>
                        {dump.selectedAssetIds.length} photos ready to view
                    </Text>
                    <GlassView style={styles.watchButton} isInteractive glassEffectStyle="regular">
                        <Ionicons name="play" size={16} color={colors.textPrimary} />
                        <Text variant="bodyS" style={{ fontWeight: '600' }}>watch dump</Text>
                    </GlassView>
                </View>
            </View>
        </Pressable>
    );
};

const RecentCard = ({ dump, onPress }: { dump: Dump; onPress: () => void }) => {
    const thumbnailUri = useDumpThumbnail(dump);

    return (
        <Pressable onPress={onPress}>
            <View style={styles.recentCard}>
                {thumbnailUri ? (
                    <Image source={{ uri: thumbnailUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
                ) : (
                    <View style={styles.recentImagePlaceholder}>
                        <Ionicons name="images" size={24} color={colors.textTertiary} />
                    </View>
                )}
                <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                    <SkiaOverlay colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFillObject} />
                </View>
                <View style={styles.recentInfo}>
                    <Text variant="bodyS" numberOfLines={1}>{dump.title || 'untitled'}</Text>
                </View>
                {dump.isExported && (
                    <View style={styles.recentCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                    </View>
                )}
            </View>
        </Pressable>
    );
};

// Helper for date formatting
function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const scrollY = useSharedValue(0);
    const hapticSignal = useSharedValue(0);
    const refreshSignal = useSharedValue(0);

    const [refreshing, setRefreshing] = useState(false);
    const [recentDumps, setRecentDumps] = useState<Dump[]>([]);
    const [photoCount, setPhotoCount] = useState(0);

    const displayName = user?.email?.split('@')[0] || 'friend';
    const weekRange = useMemo(() => getCurrentWeekRange(), []);

    const loadData = useCallback(async () => {
        try {
            const all = await getAllDumps();
            // Sort by startDate descending (newest first)
            const sorted = [...all].sort((a, b) => b.startDate - a.startDate);
            setRecentDumps(sorted);

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const photos = await PhotosService.getPhotosInDateRange(startDate, endDate);
            setPhotoCount(photos.length);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [loadData]);

    // Pull-to-refresh logic
    useAnimatedReaction(() => scrollY.value, (y, prevY) => {
        if (y >= 0 || refreshing) return;
        const progress = Math.abs(y) / (TRIGGER_HEIGHT * 0.8);
        const activeIndex = Math.floor(progress * LETTERS.length);
        const prevIndex = Math.floor(Math.abs(prevY || 0) / (TRIGGER_HEIGHT * 0.8) * LETTERS.length);
        if (activeIndex !== prevIndex && activeIndex >= 0 && activeIndex < LETTERS.length) runOnJS(triggerLightImpact)();
    }, [refreshing]);

    useAnimatedReaction(() => hapticSignal.value, (val) => {
        if (val === 1) { hapticSignal.value = 0; runOnJS(triggerMediumImpact)(); }
    });
    useAnimatedReaction(() => refreshSignal.value, (val) => {
        if (val === 1) { refreshSignal.value = 0; runOnJS(onRefresh)(); }
    }, [onRefresh]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => { scrollY.value = e.contentOffset.y; },
        onEndDrag: () => { if (scrollY.value <= -TRIGGER_HEIGHT && !refreshing) { hapticSignal.value = 1; refreshSignal.value = 1; } }
    });

    const heroDump = recentDumps.length > 0 ? recentDumps[0] : null;
    const pastDumps = recentDumps.length > 0 ? recentDumps.slice(1) : [];

    return (
        <GradientBackground style={styles.screen}>
            <View style={[styles.refreshHeader, { top: insets.top + 10 }]}>
                <View style={styles.lettersRow}>
                    {LETTERS.map((l, i) => <RefreshLetter key={i} letter={l} index={i} scrollY={scrollY} />)}
                </View>
            </View>

            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
                {/* Header */}
                <View style={[styles.header, { marginTop: spacing.lg }]}>
                    <View>
                        <Text variant="titleL">sup, {displayName.toLowerCase()} 👋</Text>
                        <Text variant="caption" color="secondary" style={styles.greeting}>{weekRange}</Text>
                    </View>
                    <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.profileButton}>
                        {(user as any)?.photoURL ? (
                            <Image source={{ uri: (user as any).photoURL }} style={styles.profileImage} />
                        ) : (
                            <Ionicons name="person" size={20} color={colors.textPrimary} />
                        )}
                    </Pressable>
                </View>

                {/* Hero Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text variant="titleM">ready to view</Text>
                        {photoCount > 0 && !heroDump && <Text variant="caption" color="accent">1 new</Text>}
                    </View>

                    {heroDump ? (
                        <HeroCard dump={heroDump} onPress={() => router.push(`/dump/${heroDump.id}`)} />
                    ) : (
                        // Empty State / CTA if no dumps exist
                        <Pressable onPress={() => router.push('/create')}>
                            <GlassView style={[styles.heroCard, { justifyContent: 'center', alignItems: 'center' }]} isInteractive glassEffectStyle="clear">
                                <Ionicons name="camera" size={48} color={colors.accent} style={{ marginBottom: spacing.md }} />
                                <Text variant="titleL" style={{ marginBottom: spacing.xs }}>create first dump</Text>
                                <Text variant="bodyS" color="secondary">
                                    {photoCount} photos found this week
                                </Text>
                                <View style={styles.createButton}>
                                    <Text variant="bodyM" style={{ fontWeight: '600', color: colors.bg }}>start</Text>
                                </View>
                            </GlassView>
                        </Pressable>
                    )}
                </View>

                {/* Recent Exports */}
                {pastDumps.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleM" style={styles.sectionTitle}>recent exports</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
                            {pastDumps.map((dump) => (
                                <RecentCard key={dump.id} dump={dump} onPress={() => router.push(`/dump/${dump.id}`)} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {pastDumps.length === 0 && heroDump && (
                    <View style={styles.section}>
                        <Text variant="titleM" style={styles.sectionTitle}>recent exports</Text>
                        <View style={styles.emptyRecent}>
                            <Text variant="bodyS" color="tertiary">your older dumps will appear here.</Text>
                        </View>
                    </View>
                )}

            </Animated.ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scrollView: { flex: 1 },
    refreshHeader: {
        position: 'absolute', left: 0, right: 0, alignItems: 'center', height: 60,
    },
    lettersRow: { flexDirection: 'row', gap: 2 },
    refreshLetter: { fontSize: 52, fontWeight: '900', color: colors.accent, letterSpacing: -2 },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
    },
    greeting: { letterSpacing: 1, marginBottom: 4 },
    profileButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface1,
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
    },
    profileImage: { width: '100%', height: '100%' },

    section: { marginBottom: spacing['2xl'] },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.xl, marginBottom: spacing.md,
    },
    sectionTitle: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },

    heroCard: {
        marginHorizontal: spacing.xl,
        height: 480,
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.surface1,
        justifyContent: 'flex-end',
    },
    heroContent: { padding: spacing.xl, gap: spacing.sm },
    heroBadge: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    heroBadgeText: { fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontSize: 10 },
    heroTitle: { fontFamily: 'System' },
    heroSubtitle: { opacity: 0.8, marginBottom: spacing.md },
    watchButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
        height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: spacing.sm,
    },
    createButton: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.accent,
    },

    recentList: { paddingHorizontal: spacing.xl, gap: spacing.md },
    recentCard: {
        width: 140, height: 140,
        borderRadius: radius.lg,
        backgroundColor: colors.surface1,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    recentImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    recentInfo: { padding: spacing.md },
    recentCheck: { position: 'absolute', top: 8, right: 8 },
    emptyRecent: { paddingHorizontal: spacing.xl },
});
