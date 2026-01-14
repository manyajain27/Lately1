/**
 * Export Screen
 * 
 * Saves photos to album and shows success state with Instagram instructions
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { getDump, markDumpAsExported } from '../../services/database';

type ExportStage = 'exporting' | 'success' | 'error';

// Fun facts during export
const FUN_FACTS = [
    '📊 fun fact: the average photo dump has 10-15 slides',
    '🎯 instagram carousels get 1.4x more reach than single posts',
    '✨ aesthetic dumps get 3x more saves',
    '📱 best time to post: between 11am-1pm or 7-9pm',
    '🔥 adding variety to your dump increases engagement',
    '💫 the first slide matters most — make it count!',
];

export default function ExportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const [stage, setStage] = useState<ExportStage>('exporting');
    const [progress, setProgress] = useState(0);
    const [currentFact, setCurrentFact] = useState(FUN_FACTS[0]);
    const [albumName, setAlbumName] = useState('');
    const [photoCount, setPhotoCount] = useState(0);

    const dumpId = params.dumpId as string;

    // Export process
    useEffect(() => {
        let factInterval: ReturnType<typeof setInterval>;

        async function exportPhotos() {
            try {
                // Generate album name with date
                const today = new Date();
                const albumTitle = `Lately — ${today.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                })}`;
                setAlbumName(albumTitle);

                // Rotate fun facts
                let factIndex = 0;
                factInterval = setInterval(() => {
                    factIndex = (factIndex + 1) % FUN_FACTS.length;
                    setCurrentFact(FUN_FACTS[factIndex]);
                }, 3000);

                // Initial progress
                setProgress(0.1);

                // Check permission
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') {
                    throw new Error('Photo library permission not granted');
                }

                setProgress(0.2);

                // Get dump data
                const dump = await getDump(dumpId);
                if (!dump) {
                    throw new Error('Dump not found');
                }

                const assetIds = dump.selectedAssetIds;
                setPhotoCount(assetIds.length);

                if (assetIds.length === 0) {
                    throw new Error('No photos in dump');
                }

                setProgress(0.4);

                // Create album with first photo
                const album = await MediaLibrary.createAlbumAsync(albumTitle, assetIds[0], true);

                setProgress(0.7);

                // Add remaining photos
                if (assetIds.length > 1) {
                    const remainingAssets = assetIds.slice(1);
                    await MediaLibrary.addAssetsToAlbumAsync(remainingAssets, album, true);
                }

                setProgress(1.0);

                // Mark dump as exported
                await markDumpAsExported(dumpId);

                clearInterval(factInterval);
                setStage('success');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            } catch (error) {
                console.error('Export error:', error);
                clearInterval(factInterval);
                setStage('error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }

        exportPhotos();

        return () => {
            if (factInterval) clearInterval(factInterval);
        };
    }, [dumpId]);

    const handleOpenInstagram = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const instagramUrl = 'instagram://app';
            const canOpen = await Linking.canOpenURL(instagramUrl);

            if (canOpen) {
                await Linking.openURL(instagramUrl);
            } else {
                Alert.alert(
                    'instagram not installed',
                    'would you like to download it?',
                    [
                        { text: 'cancel', style: 'cancel' },
                        {
                            text: 'download',
                            onPress: () => Linking.openURL('https://apps.apple.com/app/instagram/id389801252')
                        },
                    ]
                );
            }
        } catch (error) {
            console.error('Error opening Instagram:', error);
        }
    };

    const handleOpenPhotos = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Linking.openURL('photos-redirect://');
    };

    const handleDone = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/(tabs)');
    };

    // Exporting state
    if (stage === 'exporting') {
        return (
            <GradientBackground>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <Text variant="titleXL" style={styles.centerText}>
                            exporting... 📦
                        </Text>
                    </Animated.View>

                    <Animated.View
                        entering={FadeIn.delay(300).duration(300)}
                        style={styles.progressContainer}
                    >
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <Text variant="bodyS" color="secondary" style={styles.progressText}>
                            {Math.round(progress * 100)}% complete
                        </Text>
                    </Animated.View>

                    <Animated.View entering={FadeIn.delay(500).duration(300)}>
                        <GlassView style={styles.factCard} isInteractive glassEffectStyle="clear">
                            <Text variant="bodyM" color="secondary" style={styles.centerText}>
                                {currentFact}
                            </Text>
                        </GlassView>
                    </Animated.View>
                </View>
            </GradientBackground>
        );
    }

    // Error state
    if (stage === 'error') {
        return (
            <GradientBackground>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    <Text variant="titleXL" style={styles.centerText}>😅</Text>
                    <Text variant="titleL" style={[styles.centerText, styles.errorTitle]}>
                        something went wrong
                    </Text>
                    <Button
                        title="try again"
                        onPress={() => router.back()}
                        variant="secondary"
                    />
                </View>
            </GradientBackground>
        );
    }

    // Success state
    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <Text variant="titleXL" style={[styles.centerText, styles.successEmoji]}>
                        🎉
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <Text variant="titleXL" style={styles.centerText}>
                        you did it!
                    </Text>
                    <Text variant="bodyM" color="secondary" style={[styles.centerText, styles.successSubtitle]}>
                        {photoCount} photos saved to album
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(400).duration(400)}>
                    <GlassView style={styles.albumCard} isInteractive glassEffectStyle="clear">
                        <Ionicons name="images" size={24} color={colors.accent} />
                        <View style={styles.albumInfo}>
                            <Text variant="titleM">{albumName}</Text>
                            <Text variant="bodyS" color="secondary">
                                check "Albums" in Photos app
                            </Text>
                        </View>
                    </GlassView>
                </Animated.View>

                <Animated.View
                    entering={FadeInUp.delay(600).duration(400)}
                    style={styles.instructions}
                >
                    <Text variant="caption" color="tertiary" style={styles.instructionsTitle}>
                        HOW TO POST
                    </Text>
                    <View style={styles.steps}>
                        <StepItem number={1} text="open instagram" />
                        <StepItem number={2} text="tap + to create post" />
                        <StepItem number={3} text="select all photos from the album" />
                        <StepItem number={4} text="post your dump! 🔥" />
                    </View>
                </Animated.View>
            </View>

            {/* Bottom Buttons */}
            <Animated.View
                entering={FadeIn.delay(800).duration(300)}
                style={[styles.bottomButtons, { paddingBottom: insets.bottom + spacing.xl }]}
            >
                <Button
                    title="open instagram"
                    onPress={handleOpenInstagram}
                />
                <Button
                    title="open photos app"
                    onPress={handleOpenPhotos}
                    variant="secondary"
                />
                <Button
                    title="done"
                    onPress={handleDone}
                    variant="ghost"
                />
            </Animated.View>
        </GradientBackground>
    );
}

// Step item component
function StepItem({ number, text }: { number: number; text: string }) {
    return (
        <View style={styles.step}>
            <View style={styles.stepNumber}>
                <Text variant="caption" color="accent" style={styles.stepNumberText}>
                    {number}
                </Text>
            </View>
            <Text variant="bodyM" color="secondary">
                {text}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    centerText: {
        textAlign: 'center',
    },
    progressContainer: {
        width: '100%',
        marginTop: spacing['3xl'],
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: colors.surface1,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 4,
    },
    progressText: {
        marginTop: spacing.md,
        textAlign: 'center',
    },
    factCard: {
        marginTop: spacing['3xl'],
        maxWidth: 300,
        padding: spacing.lg,
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    errorTitle: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    successEmoji: {
        fontSize: 80,
        lineHeight: 100, // Prevent clipping
        marginBottom: spacing.lg,
    },
    successSubtitle: {
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
    albumCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        marginBottom: spacing['2xl'],
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    albumInfo: {
        marginLeft: spacing.md,
    },
    instructions: {
        alignSelf: 'stretch',
    },
    instructionsTitle: {
        marginBottom: spacing.md,
        letterSpacing: 1,
        textAlign: 'center',
    },
    steps: {
        backgroundColor: colors.surface1,
        borderRadius: radius.xl,
        padding: spacing.lg,
        gap: spacing.md,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surface2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    stepNumberText: {
        fontWeight: '700',
    },
    bottomButtons: {
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
});
