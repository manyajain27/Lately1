/**
 * Preview Screen
 * 
 * Carousel preview of AI-selected photos with reordering
 * Matches the design reference aesthetic
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    View
} from 'react-native';
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
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [funFact, setFunFact] = useState(FUN_FACTS[0]);
    const [progress, setProgress] = useState(0);

    // Get dump type from params
    const dumpType = (params.type as DumpType) || 'weekly';

    // Filter out removed photos
    const visiblePhotos = photos.filter(p => !removedIds.has(p.assetId));

    // Dots Scrubbing Logic
    const [dotsWidth, setDotsWidth] = useState(0);

    const handleScrub = (x: number) => {
        const width = dotsWidth || Dimensions.get('window').width;
        if (width === 0) return;

        // Linear mapping for accurate scrubbing
        const progress = Math.max(0, Math.min(1, x / width));
        const index = Math.floor(progress * visiblePhotos.length);

        if (index !== currentIndex && index >= 0 && index < visiblePhotos.length) {
            flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
            setCurrentIndex(index);
            Haptics.selectionAsync();
        }
    };



    // Fetch and analyze photos
    useEffect(() => {
        let factInterval: ReturnType<typeof setInterval>;

        const fetchAndAnalyze = async () => {
            try {
                setIsLoading(true);
                const startDate = new Date(Number(params.startDate));
                const endDate = new Date(Number(params.endDate));

                const fetchedPhotos = await PhotosService.getPhotosInDateRange(startDate, endDate);
                console.log(`[Preview] Fetched ${fetchedPhotos.length} photos`);

                if (fetchedPhotos.length === 0) {
                    setIsLoading(false);
                    return;
                }

                // Check if we have pre-selected IDs from the select screen
                const selectedIds = params.selectedIds as string | undefined;

                if (selectedIds) {
                    // Use photos selected from the select screen
                    const ids = selectedIds.split(',');
                    const selectedPhotos: PhotoWithScore[] = [];

                    for (const id of ids) {
                        const photo = fetchedPhotos.find(p => p.assetId === id);
                        if (photo) {
                            // Add default score for photos coming from select screen
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

                    // Generate smart captions
                    const smartCaptions = generateCaptionSuggestions([], dumpType, 6);
                    setCaptions(smartCaptions);

                    setIsLoading(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    // Run AI selection (legacy path)
                    setIsLoading(false);
                    setIsAnalyzing(true);

                    // Start fun fact rotation
                    let factIndex = 0;
                    factInterval = setInterval(() => {
                        factIndex = (factIndex + 1) % FUN_FACTS.length;
                        setFunFact(FUN_FACTS[factIndex]);
                        setProgress(prev => Math.min(prev + 0.15, 0.9));
                    }, 1500);

                    // Run AI selection
                    const selectedPhotos = await selectPhotosForDump(fetchedPhotos, dumpType);
                    setPhotos(selectedPhotos);
                    setProgress(1);

                    // Generate smart captions
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

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleRemovePhoto = (assetId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRemovedIds(prev => new Set([...prev, assetId]));
    };

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / PREVIEW_WIDTH);
        if (index !== currentIndex && index >= 0 && index < visiblePhotos.length) {
            setCurrentIndex(index);
            Haptics.selectionAsync();
        }
    };

    const goToSlide = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    };

    const handleRegenerateCaption = () => {
        Haptics.selectionAsync();
        setCaptionIndex(prev => (prev + 1) % captions.length);
    };

    const handleExport = async () => {
        if (visiblePhotos.length === 0) {
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
                selectedAssetIds: visiblePhotos.map(p => p.assetId),
                ordering: visiblePhotos.map((_, i) => i),
                caption: captions[captionIndex],
                isViewed: true,
                isExported: false,
                synced: false,
                createdAt: Date.now(),
            };

            await saveDump(dump);

            // Navigate to export screen which handles the actual saving to album
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

    // Loading state
    if (isLoading || isAnalyzing) {
        return (
            <GradientBackground>
                <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                    <Animated.View entering={FadeIn.duration(300)}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).duration(300)}>
                        <Text variant="titleM" style={styles.loadingTitle}>
                            {isLoading ? 'loading photos...' : 'ai is working its magic ✨'}
                        </Text>
                    </Animated.View>

                    {isAnalyzing && (
                        <>
                            <Animated.View entering={FadeIn.delay(400).duration(300)}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                                </View>
                            </Animated.View>

                            <Animated.View entering={FadeIn.duration(200)} key={funFact}>
                                <Text variant="bodyS" color="secondary" style={styles.funFact}>
                                    {funFact}
                                </Text>
                            </Animated.View>
                        </>
                    )}
                </View>
            </GradientBackground>
        );
    }

    // Empty state
    if (visiblePhotos.length === 0) {
        return (
            <GradientBackground>
                <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                    <Text variant="titleM" color="secondary">no photos found 😅</Text>
                    <Button title="go back" onPress={handleBack} style={{ marginTop: spacing.lg }} />
                </View>
            </GradientBackground>
        );
    }



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
                    <View style={styles.headerRight} />
                </Animated.View>

                {/* Main Carousel Preview */}
                <View style={styles.previewContainer}>
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <FlatList
                            ref={flatListRef}
                            data={visiblePhotos}
                            extraData={currentIndex}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                            snapToInterval={PREVIEW_WIDTH}
                            decelerationRate="fast"
                            contentContainerStyle={styles.carouselContent}
                            keyExtractor={(item) => item.assetId}
                            renderItem={({ item, index }) => {
                                const isCurrent = currentIndex === index;
                                return (
                                    <Pressable
                                        onLongPress={() => handleRemovePhoto(item.assetId)}
                                        style={styles.slideContainer}
                                    >
                                        <Animated.View style={[
                                            styles.slideWrapper,
                                            isCurrent && {
                                                transform: [{ scale: 1.02 }]
                                            }
                                        ]}>
                                            <View style={styles.slideInner}>
                                                <Image
                                                    source={{ uri: item.uri }}
                                                    style={styles.slideImage}
                                                    contentFit="cover"
                                                />

                                                {/* Watermark preview */}
                                                {!user?.isPro && (
                                                    <View style={styles.watermark}>
                                                        <Text variant="caption" style={styles.watermarkText}>
                                                            lately.
                                                        </Text>
                                                    </View>
                                                )}

                                                {/* Slide number */}
                                                <View style={styles.slideNumber}>
                                                    <Text variant="caption">
                                                        {index + 1}/{visiblePhotos.length}
                                                    </Text>
                                                </View>

                                                {/* Scene tag */}
                                                {item.score?.sceneTag && item.score.sceneTag !== 'unknown' && (
                                                    <View style={styles.sceneTag}>
                                                        <Text variant="caption" style={styles.sceneTagText}>
                                                            {item.score.sceneTag}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </Animated.View>
                                    </Pressable>
                                );
                            }}
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
                        {visiblePhotos.map((_, index) => (
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
                            {/* Caption section */}
                            <Pressable onPress={handleRegenerateCaption} style={styles.captionRow}>
                                <Text variant="bodyS" color="secondary">
                                    "{captions[captionIndex]}"
                                </Text>
                                <Ionicons name="refresh" size={16} color={colors.accent} />
                            </Pressable>

                            <View style={styles.bottomInfo}>
                                <Text variant="titleM">
                                    looking good! ✨
                                </Text>
                                <Text variant="caption" color="tertiary">
                                    {visiblePhotos.length} slides ready • long press to remove
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    loadingTitle: {
        marginTop: spacing.lg,
        textAlign: 'center',
    },
    progressBar: {
        width: 200,
        height: 4,
        backgroundColor: colors.surface1,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: spacing.md,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 2,
    },
    funFact: {
        marginTop: spacing.lg,
        textAlign: 'center',
    },
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 40,
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: spacing['2xl'], // Push down from header
    },
    carouselContent: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl, // Add space for shadow/glow
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
        // No overflow hidden here to allow shadows
    },
    slideInner: {
        flex: 1,
        borderRadius: radius.xl,
        overflow: 'hidden', // Clip inner content (image)
    },
    slideImage: {
        flex: 1,
    },
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
    sceneTagText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#000',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -spacing.md, // Pull up closer
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
    dotActive: {
        backgroundColor: colors.accent,
        width: 24,
    },
    bottomBar: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm, // Reduced from md
    },
    bottomCard: {
        borderRadius: radius.xl,
        padding: spacing.md, // Reduced from lg
        overflow: 'hidden',
    },
    bottomContent: {
        gap: spacing.sm, // Reduced from md
    },
    captionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs, // Added slightly
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderSoft,
    },
    bottomInfo: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    exportButton: {
        marginTop: spacing.sm,
    },
});
