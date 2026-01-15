/**
 * Memories Screen
 * 
 * Grid gallery with filters: All, Weekly, Trips, Monthly
 * Design matches reference: 2-column grid, square cards
 * Includes Swipe Preview for dumping photos directly from grid
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, Text } from '../../components/ui';
import { SkiaOverlay } from '../../components/ui/SkiaGradient';
import { colors, radius, spacing } from '../../constants/theme';
import { getAllDumps, getDumpsByType } from '../../services/database';
import { Dump } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_gap = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - (spacing.xl * 2) - COLUMN_gap) / 2;

type FilterType = 'all' | 'weekly' | 'trip' | 'monthly';

function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MemoriesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [dumps, setDumps] = useState<Dump[]>([]);

    // Data cache
    const [allDumps, setAllDumps] = useState<Dump[]>([]);
    const [weeklyDumps, setWeeklyDumps] = useState<Dump[]>([]);
    const [monthlyDumps, setMonthlyDumps] = useState<Dump[]>([]);
    const [tripDumps, setTripDumps] = useState<Dump[]>([]);

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
            setAllDumps(all);

            updateView(activeFilter, { weekly, monthly, trips, all });
        } catch (e) {
            console.error(e);
        }
    }, [activeFilter]);

    const updateView = (filter: FilterType, data: any) => {
        switch (filter) {
            case 'all': setDumps(data.all); break;
            case 'weekly': setDumps(data.weekly); break;
            case 'trip': setDumps(data.trips); break;
            case 'monthly': setDumps(data.monthly); break;
        }
    };

    useEffect(() => { loadData(); }, [loadData]);

    const handleFilterChange = (filter: FilterType) => {
        Haptics.selectionAsync();
        setActiveFilter(filter);
        switch (filter) {
            case 'all': setDumps(allDumps); break;
            case 'weekly': setDumps(weeklyDumps); break;
            case 'trip': setDumps(tripDumps); break;
            case 'monthly': setDumps(monthlyDumps); break;
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    return (
        <GradientBackground style={styles.screen}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text variant="titleL">memories</Text>
                <Pressable style={styles.searchButton}>
                    <Ionicons name="search" size={20} color={colors.textPrimary} />
                </Pressable>
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                    <FilterPill label="all" active={activeFilter === 'all'} onPress={() => handleFilterChange('all')} />
                    <FilterPill label="weekly" active={activeFilter === 'weekly'} onPress={() => handleFilterChange('weekly')} />
                    <FilterPill label="trips" active={activeFilter === 'trip'} onPress={() => handleFilterChange('trip')} />
                    <FilterPill label="monthly" active={activeFilter === 'monthly'} onPress={() => handleFilterChange('monthly')} />
                </ScrollView>
            </View>

            {/* Grid */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                removeClippedSubviews={true}
            >
                {dumps.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text variant="bodyM" color="tertiary">no memories yet</Text>
                        <Pressable onPress={() => router.push('/create')} style={{ marginTop: spacing.md, padding: spacing.sm }}>
                            <Text variant="bodyS" color="accent">create your first dump</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {dumps.map((dump, index) => (
                            <Animated.View key={dump.id} entering={FadeInDown.delay(index * 50).duration(400)}>
                                <SwipeableDumpCard
                                    dump={dump}
                                    onPress={() => router.push(`/dump/${dump.id}`)}
                                />
                            </Animated.View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </GradientBackground>
    );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.filterPill,
                active ? styles.filterPillActive : { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }
            ]}
        >
            <Text
                variant="bodyS"
                style={{
                    fontWeight: active ? '600' : '500',
                    color: active ? '#000000' : '#FFFFFF'
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

// Card with horizontal swipe preview
function SwipeableDumpCard({ dump, onPress }: { dump: Dump; onPress: () => void }) {
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    // Fetch first 5 thumbnails
    useEffect(() => {
        let isMounted = true;
        async function loadThumbs() {
            if (dump.selectedAssetIds.length > 0) {
                try {
                    // Limit to 5 for preview
                    const idsToFetch = dump.selectedAssetIds.slice(0, 5);
                    const assets = await Promise.all(idsToFetch.map(id => MediaLibrary.getAssetInfoAsync(id).catch(() => null)));
                    const validUris = assets.filter(a => a && (a.localUri || a.uri)).map(a => a?.localUri || a?.uri || '');

                    if (isMounted && validUris.length > 0) {
                        setThumbnails(validUris);
                    }
                } catch (e) { console.error('Error loading thumbnails', e); }
            }
        }
        loadThumbs();
        return () => { isMounted = false; };
    }, [dump.id]);

    const handleScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        if (slideSize === 0) return;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        if (roundIndex !== activeIndex) {
            setActiveIndex(roundIndex);
        }
    };

    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardImageContainer}>
                {thumbnails.length > 0 ? (
                    <FlatList
                        data={thumbnails}
                        keyExtractor={(_, i) => i.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        decelerationRate="fast" // Instagram-like snap
                        snapToInterval={CARD_WIDTH} // Explicit snap
                        snapToAlignment="start"
                        disableIntervalMomentum={true}
                        renderItem={({ item }) => (
                            <Pressable onPress={onPress}>
                                <Image
                                    source={{ uri: item }}
                                    style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.25 }}
                                    contentFit="cover"
                                    transition={200}
                                />
                            </Pressable>
                        )}
                    />
                ) : (
                    <Pressable onPress={onPress} style={styles.placeholderImage}>
                        <Ionicons name="images" size={24} color={colors.textTertiary} />
                    </Pressable>
                )}

                {/* Gradient Overlay (pointerEvents="none" to pass touches to list) */}
                <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                    <SkiaOverlay
                        colors={['transparent', 'rgba(0,0,0,0.4)']}
                        style={StyleSheet.absoluteFillObject}
                    />
                </View>

                {/* Pagination Dots */}
                {thumbnails.length > 1 && (
                    <View style={styles.pagination}>
                        {thumbnails.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.paginationDot,
                                    i === activeIndex && styles.paginationDotActive
                                ]}
                            />
                        ))}
                    </View>
                )}

                {!dump.isViewed && <View style={styles.newBadge} />}
            </View>

            <Pressable onPress={onPress} style={styles.cardInfo}>
                <Text variant="bodyS" numberOfLines={1} style={styles.cardTitle}>{dump.title || 'Untitled'}</Text>
                <Text variant="caption" color="tertiary">
                    {formatDate(dump.startDate)} • {dump.selectedAssetIds.length} photos
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.xl, marginBottom: spacing.md,
    },
    searchButton: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface1,
        justifyContent: 'center', alignItems: 'center',
    },
    filtersContainer: { marginBottom: spacing.lg },
    filtersScroll: { paddingHorizontal: spacing.xl, gap: spacing.sm },
    filterPill: {
        paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.full,
        backgroundColor: colors.surface1, borderWidth: 1, borderColor: 'transparent',
    },
    filterPillActive: { backgroundColor: colors.textPrimary }, // White bg

    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.xl },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: COLUMN_gap },
    emptyState: { padding: spacing.xl, alignItems: 'center' },

    cardContainer: { width: CARD_WIDTH, marginBottom: spacing.lg },
    cardImageContainer: {
        width: CARD_WIDTH, height: CARD_WIDTH * 1.25, // 4:5 aspect ratio
        borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface1,
        marginBottom: spacing.xs,
        position: 'relative'
    },
    placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    newBadge: {
        position: 'absolute', top: 8, right: 8,
        width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
    },
    cardInfo: { gap: 2 },
    cardTitle: { fontWeight: '600' },

    pagination: {
        position: 'absolute', bottom: 8, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 4,
    },
    paginationDot: {
        width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)',
    },
    paginationDotActive: {
        backgroundColor: colors.textPrimary, width: 6,
    }
});
