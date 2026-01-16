/**
 * Preview Screen
 * 
 * Carousel preview of AI-selected photos with reordering
 * Tap "reorder" for grid mode with drag-to-reorder
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ListRenderItem,
    Pressable,
    StyleSheet,
    View
} from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';
import { generateCaptionSuggestions } from '../../services/captions';
import { saveDump } from '../../services/database';
import { PhotosService } from '../../services/photos';
import { selectPhotosForDump } from '../../services/selection';
import { Dump, DumpType, PhotoWithScore } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.25; // 4:5 aspect ratio (Instagram)

// Grid layout constants
const GRID_PADDING = spacing.md;
const GRID_GAP = 4;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Fun facts for loading state
const FUN_FACTS = [
    '📊 analyzing composition and lighting...',
    '🎨 detecting aesthetic vibes...',
    '👥 finding the best people shots...',
    '🌅 scanning for golden hour magic...',
    '🍕 spotted some food pics!',
    '✨ calculating aesthetic scores...',
    '🎯 picking the perfect variety...',
    '🪄 almost there, magic happening...',
];

// Fallback captions
const FALLBACK_CAPTIONS = [
    'lately ☁️',
    'a lil photo dump',
    'moments ✨',
    'life lately 🌙',
];

export default function PreviewScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();
    const flatListRef = useRef<FlatList>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [photos, setPhotos] = useState<PhotoWithScore[]>([]);
    const [captions, setCaptions] = useState<string[]>(FALLBACK_CAPTIONS);
    const [captionIndex, setCaptionIndex] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [funFact, setFunFact] = useState(FUN_FACTS[0]);
    const [progress, setProgress] = useState(0);

    // Toggle between carousel and reorder mode
    const [isReorderMode, setIsReorderMode] = useState(false);

    // Track tap counts for triple-tap delete
    const tapCountRef = useRef<Map<string, { count: number; timer: ReturnType<typeof setTimeout> | null }>>(new Map());

    // Get dump type from params
    const dumpType = (params.type as DumpType) || 'weekly';

    // Dots Scrubbing Logic
    const [dotsWidth, setDotsWidth] = useState(0);

    const handleScrub = useCallback((x: number) => {
        const width = dotsWidth || Dimensions.get('window').width;
        if (width === 0) return;

        const progress = Math.max(0, Math.min(1, x / width));
        const index = Math.floor(progress * photos.length);

        if (index !== currentIndex && index >= 0 && index < photos.length) {
            flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
            setCurrentIndex(index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
    }, [dotsWidth, photos.length, currentIndex]);

    // Fetch and analyze photos
    useEffect(() => {
        let factInterval: ReturnType<typeof setInterval>;

        const fetchAndAnalyze = async () => {
            try {
                setIsLoading(true);
                const startDate = new Date(Number(params.startDate));
                const endDate = new Date(Number(params.endDate));

                const fetchedPhotos = await PhotosService.getPhotosInDateRange(startDate, endDate);

                if (fetchedPhotos.length === 0) {
                    setIsLoading(false);
                    return;
                }

                const selectedIds = params.selectedIds as string | undefined;

                if (selectedIds) {
                    const ids = selectedIds.split(',');
                    const selectedPhotos: PhotoWithScore[] = [];

                    for (const id of ids) {
                        const photo = fetchedPhotos.find(p => p.assetId === id);
                        if (photo) {
                            selectedPhotos.push({
                                ...photo,
                                score: {
                                    assetId: photo.assetId,
                                    blurScore: 0.8,
                                    brightnessScore: 0.5,
                                    faceCount: 0,
                                    faceScore: 0,
                                    cachedAt: Date.now(),
                                },
                            });
                        }
                    }

                    setPhotos(selectedPhotos);
                    const smartCaptions = generateCaptionSuggestions([], dumpType, 6);
                    setCaptions(smartCaptions);
                    setIsLoading(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    setIsLoading(false);
                    setIsAnalyzing(true);

                    let factIndex = 0;
                    factInterval = setInterval(() => {
                        factIndex = (factIndex + 1) % FUN_FACTS.length;
                        setFunFact(FUN_FACTS[factIndex]);
                        setProgress(prev => Math.min(prev + 0.15, 0.9));
                    }, 1500);

                    const selectedPhotos = await selectPhotosForDump(fetchedPhotos, dumpType);
                    setPhotos(selectedPhotos);
                    setProgress(1);

                    const scores = selectedPhotos.map(p => p.score);
                    const smartCaptions = generateCaptionSuggestions(scores, dumpType, 6);
                    setCaptions(smartCaptions);

                    setIsAnalyzing(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (e) {
                console.error('[Preview] Error:', e);
                Alert.alert('Error', 'Failed to analyze photos. Please try again.');
            } finally {
                setIsLoading(false);
                setIsAnalyzing(false);
                if (factInterval) clearInterval(factInterval);
            }
        };

        if (params.startDate && params.endDate) {
            fetchAndAnalyze();
        }

        return () => {
            if (factInterval) clearInterval(factInterval);
        };
    }, [params.startDate, params.endDate, params.selectedIds, dumpType]);

    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isReorderMode) {
            setIsReorderMode(false);
        } else {
            router.back();
        }
    }, [router, isReorderMode]);

    // Triple-tap to delete
    const handleTripleTap = useCallback((assetId: string) => {
        const tapData = tapCountRef.current.get(assetId) || { count: 0, timer: null };

        // Clear existing timer
        if (tapData.timer) {
            clearTimeout(tapData.timer);
        }

        const newCount = tapData.count + 1;

        if (newCount >= 3) {
            // Triple tap achieved!
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setPhotos(prev => prev.filter(p => p.assetId !== assetId));
            tapCountRef.current.delete(assetId);
        } else {
            // Quick haptic feedback for each tap
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Set new timer to reset count
            const timer = setTimeout(() => {
                tapCountRef.current.delete(assetId);
            }, 500); // 500ms window for triple tap

            tapCountRef.current.set(assetId, { count: newCount, timer });
        }
    }, []);

    const handleScroll = useCallback((event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / PREVIEW_WIDTH);
        if (index !== currentIndex && index >= 0 && index < photos.length) {
            setCurrentIndex(index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
    }, [currentIndex, photos.length]);

    const handleRegenerateCaption = useCallback(() => {
        Haptics.selectionAsync();
        setCaptionIndex(prev => (prev + 1) % captions.length);
    }, [captions.length]);

    // Handle drag end - reorder photos
    const handleDragEnd = useCallback(({ data }: { data: PhotoWithScore[] }) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPhotos(data);
    }, []);

    const handleExport = async () => {
        if (photos.length === 0) {
            Alert.alert('No Photos', 'Add some photos to export.');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const dumpId = `dump-${Date.now()}`;
            const startDate = Number(params.startDate);
            const endDate = Number(params.endDate);

            const dump: Dump = {
                id: dumpId,
                type: dumpType,
                title: '',
                startDate,
                endDate,
                selectedAssetIds: photos.map(p => p.assetId),
                ordering: photos.map((_, i) => i),
                caption: captions[captionIndex],
                isViewed: true,
                isExported: false,
                synced: false,
                createdAt: Date.now(),
            };

            await saveDump(dump);
            router.push({
                pathname: '/create/export',
                params: { dumpId }
            });

        } catch (e) {
            console.error('[Export] Error:', e);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to prepare export.');
        }
    };

    // Carousel render item
    const renderCarouselItem: ListRenderItem<PhotoWithScore> = useCallback(({ item, index }) => (
        <PreviewSlide
            item={item}
            index={index}
            total={photos.length}
            isCurrent={currentIndex === index}
            onTripleTap={() => handleTripleTap(item.assetId)}
            isPro={user?.isPro || false}
        />
    ), [currentIndex, photos.length, handleTripleTap, user?.isPro]);

    // Visual-first card for reorder mode
    const renderGridItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<PhotoWithScore>) => {
        const index = getIndex() ?? 0;
        return (
            <ScaleDecorator activeScale={1.03}>
                <Pressable
                    onLongPress={drag}
                    onPress={() => handleTripleTap(item.assetId)}
                    delayLongPress={80}
                    style={[
                        styles.gridItem,
                        isActive && styles.gridItemActive,
                    ]}
                >
                    {/* Full-bleed Photo */}
                    <Image
                        source={{ uri: item.uri }}
                        style={styles.gridImage}
                        contentFit="cover"
                    />

                    {/* Position Pill */}
                    <View style={styles.positionBadge}>
                        <Text style={styles.positionText}>{index + 1}</Text>
                    </View>

                    {/* Drag Handle */}
                    <View style={[styles.dragHandle, isActive && { backgroundColor: colors.accent }]}>
                        <Ionicons name="menu" size={20} color="white" />
                    </View>

                    {/* Active Border */}
                    {isActive && <View style={styles.activeOverlay} />}
                </Pressable>
            </ScaleDecorator>
        );
    }, [handleTripleTap]);

    // Loading/Analyzing
    if (isLoading || isAnalyzing) {
        return (
            <GradientBackground>
                <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text variant="titleM" style={styles.loadingTitle}>
                        {isLoading ? 'loading photos...' : 'ai is working its magic ✨'}
                    </Text>
                    {isAnalyzing && (
                        <>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                            </View>
                            <Text variant="bodyS" color="secondary" style={styles.funFact}>
                                {funFact}
                            </Text>
                        </>
                    )}
                </View>
            </GradientBackground>
        );
    }

    if (photos.length === 0) {
        return (
            <GradientBackground>
                <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                    <Text variant="titleM" color="secondary">no photos found 😅</Text>
                    <Button title="go back" onPress={handleBack} style={{ marginTop: spacing.lg }} />
                </View>
            </GradientBackground>
        );
    }

    // =========================================================================
    // REORDER MODE (Grid with drag-to-reorder)
    // =========================================================================
    if (isReorderMode) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <GradientBackground>
                    <View style={[styles.container, { paddingTop: insets.top }]}>
                        {/* Header */}
                        <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
                            <Pressable onPress={handleBack} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                            </Pressable>
                            <View style={styles.headerCenter}>
                                <Text variant="titleM">reorder</Text>
                                <Text variant="caption" color="tertiary">drag to reorder • triple-tap to remove</Text>
                            </View>
                            <Pressable onPress={() => setIsReorderMode(false)} style={styles.doneButton}>
                                <Text style={styles.doneText}>done</Text>
                            </Pressable>
                        </Animated.View>

                        {/* Draggable List - Single column for reliable dragging */}
                        <DraggableFlatList
                            data={photos}
                            renderItem={renderGridItem}
                            keyExtractor={(item) => item.assetId}
                            onDragEnd={handleDragEnd}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            activationDistance={5}
                            dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
                        />
                    </View>
                </GradientBackground>
            </GestureHandlerRootView>
        );
    }

    // =========================================================================
    // NORMAL MODE (Carousel preview)
    // =========================================================================
    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
                    <Pressable onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text variant="titleM">preview</Text>
                    </View>
                    <Pressable onPress={() => setIsReorderMode(true)} style={styles.reorderButton}>
                        <Ionicons name="grid-outline" size={20} color={colors.accent} />
                    </Pressable>
                </Animated.View>

                {/* Main Carousel */}
                <View style={styles.previewContainer}>
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <FlatList
                            ref={flatListRef}
                            data={photos}
                            renderItem={renderCarouselItem}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                            snapToInterval={PREVIEW_WIDTH}
                            decelerationRate="fast"
                            contentContainerStyle={styles.carouselContent}
                            keyExtractor={(item) => item.assetId}
                            getItemLayout={(_, index) => ({
                                length: PREVIEW_WIDTH,
                                offset: PREVIEW_WIDTH * index,
                                index,
                            })}
                            removeClippedSubviews={true}
                            initialNumToRender={2}
                            maxToRenderPerBatch={2}
                            windowSize={3}
                        />
                    </Animated.View>

                    {/* Dots indicator */}
                    <View
                        style={styles.dotsContainer}
                        pointerEvents="box-only"
                        onLayout={(e) => setDotsWidth(e.nativeEvent.layout.width)}
                        onTouchStart={(e) => handleScrub(e.nativeEvent.locationX)}
                        onTouchMove={(e) => handleScrub(e.nativeEvent.locationX)}
                    >
                        {photos.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentIndex === index && styles.dotActive
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Bottom Actions */}
                <Animated.View
                    entering={FadeIn.delay(300).duration(300)}
                    style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}
                >
                    <GlassView style={styles.bottomCard} isInteractive glassEffectStyle="clear">
                        <View style={styles.bottomContent}>
                            <Pressable onPress={handleRegenerateCaption} style={styles.captionRow}>
                                <Text variant="bodyS" color="secondary">
                                    "{captions[captionIndex]}"
                                </Text>
                                <Ionicons name="refresh" size={16} color={colors.accent} />
                            </Pressable>

                            <View style={styles.bottomInfo}>
                                <Text variant="titleM">looking good! ✨</Text>
                                <Text variant="caption" color="tertiary">
                                    {photos.length} slides • triple-tap to remove
                                </Text>
                            </View>

                            <Button
                                title={isExporting ? 'exporting...' : 'export'}
                                onPress={handleExport}
                                loading={isExporting}
                                style={styles.exportButton}
                            />
                        </View>
                    </GlassView>
                </Animated.View>
            </View>
        </GradientBackground>
    );
}

// Memoized Slide Component for Carousel
const PreviewSlide = memo(({
    item,
    index,
    total,
    isCurrent,
    onTripleTap,
    isPro
}: {
    item: PhotoWithScore;
    index: number;
    total: number;
    isCurrent: boolean;
    onTripleTap: () => void;
    isPro: boolean;
}) => {
    return (
        <Pressable onPress={onTripleTap} style={styles.slideContainer}>
            <Animated.View style={[
                styles.slideWrapper,
                isCurrent && { transform: [{ scale: 1.02 }] }
            ]}>
                <View style={styles.slideInner}>
                    <Image
                        source={{ uri: item.uri }}
                        style={styles.slideImage}
                        contentFit="cover"
                    />
                    {!isPro && (
                        <View style={styles.watermark}>
                            <Text variant="caption" style={styles.watermarkText}>lately.</Text>
                        </View>
                    )}
                    <View style={styles.slideNumber}>
                        <Text variant="caption">{index + 1}/{total}</Text>
                    </View>
                    {item.score?.sceneTag && item.score.sceneTag !== 'unknown' && (
                        <View style={styles.sceneTag}>
                            <Text variant="caption" style={styles.sceneTagText}>{item.score.sceneTag}</Text>
                        </View>
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    loadingTitle: { marginTop: spacing.lg, textAlign: 'center' },
    progressBar: {
        width: 200,
        height: 4,
        backgroundColor: colors.surface1,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: spacing.md,
    },
    progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
    funFact: { marginTop: spacing.lg, textAlign: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    reorderButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    doneText: {
        color: colors.accent,
        fontWeight: '600',
        fontSize: 16,
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: spacing['2xl'],
    },
    carouselContent: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
    },
    slideContainer: {
        width: PREVIEW_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideWrapper: {
        width: PREVIEW_WIDTH - spacing.md,
        height: PREVIEW_HEIGHT,
        borderRadius: radius.xl,
        backgroundColor: colors.surface1,
    },
    slideInner: { flex: 1, borderRadius: radius.xl, overflow: 'hidden' },
    slideImage: { flex: 1 },
    watermark: {
        position: 'absolute',
        bottom: spacing.md,
        right: spacing.md,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
    },
    watermarkText: {
        fontSize: 12,
        fontWeight: '600',
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.8)',
    },
    slideNumber: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
    },
    sceneTag: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: 'rgba(79, 240, 183, 0.9)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
    },
    sceneTagText: { fontSize: 10, fontWeight: '600', color: '#000' },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -spacing.md,
        marginBottom: spacing.md,
        gap: spacing.xs,
        height: 40,
        width: '100%',
        backgroundColor: 'transparent',
        zIndex: 9999,
        elevation: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surface2,
    },
    dotActive: { backgroundColor: colors.accent, width: 24 },
    bottomBar: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    bottomCard: { borderRadius: radius.xl, padding: spacing.md, overflow: 'hidden' },
    bottomContent: { gap: spacing.sm },
    captionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderSoft,
    },
    bottomInfo: { alignItems: 'center', gap: spacing.xs },
    exportButton: { marginTop: spacing.sm },
    // Grid styles for reorder mode
    gridContent: {
        paddingHorizontal: GRID_PADDING,
        paddingBottom: 100,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: 140,
        gap: 12,
    },
    gridItem: {
        width: SCREEN_WIDTH - spacing.lg * 2,
        aspectRatio: 16 / 9,
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.surface1,
    },
    gridItemActive: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 15,
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    positionBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    positionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    dragHandle: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 3,
        borderColor: colors.accent,
        borderRadius: radius.xl,
    },
});
