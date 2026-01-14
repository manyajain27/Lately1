/**
 * Photo Selection Screen
 * 
 * AI analyzes photos and presents selection
 * User can swap, reorder, add more
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ListRenderItem,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { PhotosService } from '../../services/photos';
import { analyzeAndPick } from '../../services/scoring';
import { DumpType, PhotoMeta, PhotoScore } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm * 2) / 3;

interface PhotoWithSelection extends PhotoMeta {
    selected: boolean;
    position: number | null;
    score?: PhotoScore;
}

type AnalysisStage = 'loading' | 'analyzing' | 'done' | 'error';

// Fun facts to show during analysis
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

export default function SelectScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const [stage, setStage] = useState<AnalysisStage>('loading');
    const [allPhotos, setAllPhotos] = useState<PhotoWithSelection[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState<PhotoWithSelection[]>([]);
    const [funFact, setFunFact] = useState(FUN_FACTS[0]);
    const [progress, setProgress] = useState(0);

    const dumpType = (params.type as DumpType) || 'weekly';

    // Load and analyze photos
    useEffect(() => {
        let factInterval: ReturnType<typeof setInterval>;

        async function loadAndAnalyze() {
            try {
                const hasPermission = await PhotosService.requestPermissions();
                if (!hasPermission) {
                    Alert.alert('permission needed', 'please enable photo access in settings');
                    router.back();
                    return;
                }

                const startDate = new Date(Number(params.startDate));
                const endDate = new Date(Number(params.endDate));

                const fetchedPhotos = await PhotosService.getPhotosInDateRange(startDate, endDate);

                if (fetchedPhotos.length === 0) {
                    Alert.alert('no photos found', 'try taking some photos first! 📸');
                    router.back();
                    return;
                }

                const photos: PhotoWithSelection[] = fetchedPhotos.map((p) => ({
                    ...p,
                    selected: false,
                    position: null,
                }));

                setAllPhotos(photos);
                setStage('analyzing');

                let factIndex = 0;
                factInterval = setInterval(() => {
                    factIndex = (factIndex + 1) % FUN_FACTS.length;
                    setFunFact(FUN_FACTS[factIndex]);
                    setProgress(prev => Math.min(prev + 0.1, 0.9));
                }, 1500);

                const selectedCandidates = await analyzeAndPick(fetchedPhotos);
                setProgress(1);

                const selectedIds = new Set(selectedCandidates.map(p => p.assetId));
                let positionCounter = 1;

                const newAllPhotos: PhotoWithSelection[] = photos.map(p => {
                    const isSelected = selectedIds.has(p.assetId);
                    return {
                        ...p,
                        selected: isSelected,
                        position: isSelected ? positionCounter++ : null
                    };
                });

                const newSelectedPhotos = newAllPhotos.filter(p => p.selected);

                setAllPhotos(newAllPhotos);
                setSelectedPhotos(newSelectedPhotos);

                clearInterval(factInterval);
                setStage('done');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            } catch (error) {
                console.error('Error loading photos:', error);
                setStage('error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }

        loadAndAnalyze();

        return () => {
            if (factInterval) clearInterval(factInterval);
        };
    }, [params.startDate, params.endDate, router]);

    const handleTogglePhoto = useCallback((photo: PhotoWithSelection) => {
        Haptics.selectionAsync();

        if (photo.selected) {
            setSelectedPhotos(prev => {
                const filtered = prev.filter(p => p.assetId !== photo.assetId);
                return filtered.map((p, i) => ({ ...p, position: i + 1 }));
            });
            setAllPhotos(prev => prev.map(p =>
                p.assetId === photo.assetId ? { ...p, selected: false, position: null } : p
            ));
        } else {
            if (selectedPhotos.length >= 20) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert('max 20 photos', 'remove one to add another');
                return;
            }

            const newPosition = selectedPhotos.length + 1;
            const updatedPhoto = { ...photo, selected: true, position: newPosition };
            setSelectedPhotos(prev => [...prev, updatedPhoto]);
            setAllPhotos(prev => prev.map(p =>
                p.assetId === photo.assetId ? updatedPhoto : p
            ));
        }
    }, [selectedPhotos.length]);

    const handleContinue = () => {
        if (selectedPhotos.length < 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('select at least 1 photo');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        router.push({
            pathname: '/create/preview',
            params: {
                type: dumpType,
                startDate: params.startDate,
                endDate: params.endDate,
                selectedIds: selectedPhotos.map(p => p.assetId).join(','),
            }
        });
    };

    const handleGoBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const renderItem: ListRenderItem<PhotoWithSelection> = useCallback(({ item }) => (
        <PhotoTile
            photo={item}
            onPress={() => handleTogglePhoto(item)}
        />
    ), [handleTogglePhoto]);

    // Optimize data
    const memoizedAllPhotos = useMemo(() => allPhotos, [allPhotos]);

    if (stage === 'loading' || stage === 'analyzing') {
        return (
            <GradientBackground>
                <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text variant="titleM" style={styles.loadingTitle}>
                        {stage === 'loading' ? 'loading photos...' : 'ai is working its magic ✨'}
                    </Text>
                    {stage === 'analyzing' && (
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

    if (stage === 'error') {
        return (
            <GradientBackground>
                <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                    <Text variant="titleL">something went wrong 😅</Text>
                    <Button title="try again" onPress={handleGoBack} variant="secondary" />
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={handleGoBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text variant="titleM">{selectedPhotos.length} selected</Text>
                    </View>
                    <View style={styles.headerRight} />
                </View>

                {/* Photo Grid */}
                <FlatList
                    data={memoizedAllPhotos}
                    numColumns={3}
                    keyExtractor={(item) => item.assetId}
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    initialNumToRender={12}
                    maxToRenderPerBatch={12}
                    windowSize={7}
                    getItemLayout={(_, index) => ({
                        length: PHOTO_SIZE + spacing.xs * 2,
                        offset: (PHOTO_SIZE + spacing.xs * 2) * Math.floor(index / 3),
                        index,
                    })}
                    ListFooterComponent={
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>LATELY</Text>
                        </View>
                    }
                    renderItem={renderItem}
                />

                {/* Bottom Bar */}
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <GlassView style={styles.bottomCard} glassEffectStyle='clear'>
                        <View style={styles.bottomContent}>
                            <Button
                                title={`continue (${selectedPhotos.length}/20 photos)`}
                                onPress={handleContinue}
                                disabled={selectedPhotos.length < 1}
                                height={56}
                                style={styles.continueButton}
                            />
                        </View>
                    </GlassView>
                </View>
            </View>
        </GradientBackground>
    );
}

// Photo tile component
const PhotoTile = memo(({ photo, onPress }: { photo: PhotoWithSelection; onPress: () => void }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.photoTile}
        >
            <Animated.View style={[styles.photoTileInner, animatedStyle]}>
                <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                    contentFit="cover"
                />
                {photo.selected && (
                    <View style={styles.selectedOverlay}>
                        <View style={styles.positionBadge}>
                            <Text variant="caption" style={styles.positionText}>{photo.position}</Text>
                        </View>
                    </View>
                )}
                <View style={[styles.checkbox, photo.selected && styles.checkboxSelected]}>
                    {photo.selected && <Ionicons name="checkmark" size={14} color={colors.bg} />}
                </View>
            </Animated.View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
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
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderSoft,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerRight: { width: 40 },
    gridContent: { padding: spacing.xl },
    photoTile: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        margin: spacing.xs,
    },
    photoTileInner: { flex: 1, borderRadius: radius.md, overflow: 'hidden' },
    photoImage: { flex: 1 },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(79, 240, 183, 0.25)',
        borderWidth: 2,
        borderColor: colors.accent,
        borderRadius: radius.md,
    },
    positionBadge: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        backgroundColor: colors.accent,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    positionText: { color: colors.bg, fontWeight: '700', fontSize: 11 },
    checkbox: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl * 1.5,
        paddingTop: spacing.md,
        zIndex: 100,
    },
    bottomCard: { borderRadius: radius.xl, padding: spacing.md, overflow: 'hidden' },
    bottomContent: { justifyContent: 'center' },
    continueButton: { width: '100%' },
    footer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing['2xl'],
        paddingBottom: 120,
        width: '100%',
    },
    footerText: {
        fontSize: 80,
        lineHeight: 80,
        fontWeight: '900',
        color: colors.accent,
        opacity: 0.2,
        letterSpacing: -2,
        textAlign: 'center',
    },
});
