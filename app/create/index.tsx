/**
 * Create Dump - Start Screen
 * 
 * Entry point for dump creation with two modes:
 * 1. Smart Selection (AI-powered)
 * 2. Manual Selection (user picks everything)
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { PhotosService } from '../../services/photos';
import { DumpType } from '../../types';

// Format date for display
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type SelectionMode = 'smart' | 'manual';

export default function CreateScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Selection mode state
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('smart');
    const [selectedType, setSelectedType] = useState<DumpType>('weekly');
    const [loading, setLoading] = useState(true);
    const [photoCount, setPhotoCount] = useState(0);
    const [showTips, setShowTips] = useState(false);

    // Custom Date Picker State
    const [customStartDate, setCustomStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end'>('start');

    // Calculate date range based on selected type
    const dateRange = useMemo(() => {
        if (selectedType === 'manual') {
            return { startDate: customStartDate, endDate: customEndDate };
        }

        const endDate = new Date();
        const startDate = new Date();

        if (selectedType === 'weekly') {
            startDate.setDate(endDate.getDate() - 7);
        } else if (selectedType === 'monthly') {
            startDate.setDate(1);
        } else {
            startDate.setDate(endDate.getDate() - 7);
        }

        return { startDate, endDate };
    }, [selectedType, customStartDate, customEndDate]);

    // Fetch photo count
    useEffect(() => {
        async function fetchPhotos() {
            try {
                setLoading(true);
                const hasPermission = await PhotosService.requestPermissions();
                if (!hasPermission) {
                    setLoading(false);
                    return;
                }

                const photos = await PhotosService.getPhotosInDateRange(
                    dateRange.startDate,
                    dateRange.endDate
                );
                setPhotoCount(photos.length);
            } catch (e) {
                console.error('[Create] Error fetching photos:', e);
            } finally {
                setLoading(false);
            }
        }

        fetchPhotos();
    }, [dateRange]);

    const openPicker = (target: 'start' | 'end') => {
        setDatePickerTarget(target);
        setShowDatePicker(true);
        Haptics.selectionAsync();
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            if (datePickerTarget === 'start') {
                if (selectedDate > customEndDate) setCustomEndDate(selectedDate);
                setCustomStartDate(selectedDate);
            } else {
                if (selectedDate < customStartDate) setCustomStartDate(selectedDate);
                setCustomEndDate(selectedDate);
            }
        }
    };

    const handleTypeSelect = (type: DumpType) => {
        Haptics.selectionAsync();
        setSelectedType(type);
    };

    const handleModeSelect = (mode: SelectionMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectionMode(mode);
        // Auto-open tips for manual mode
        if (mode === 'manual') {
            setShowTips(true);
        }
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/(tabs)');
    };

    const handleContinue = async () => {
        if (photoCount === 0) {
            Alert.alert('No Photos', 'No photos found in the selected date range.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: '/create/select',
            params: {
                type: selectedType,
                selectionMode: selectionMode,
                startDate: dateRange.startDate.getTime(),
                endDate: dateRange.endDate.getTime()
            }
        });
    };

    return (
        <GradientBackground>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + spacing.md }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header with back button */}
                <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
                    <Pressable onPress={handleClose} style={styles.backButton}>
                        <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => { Haptics.selectionAsync(); setShowTips(true); }} style={styles.backButton}>
                        <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
                    </Pressable>
                </Animated.View>

                {/* Main Content */}
                <View style={styles.content}>
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <Text variant="titleXL" style={styles.title}>
                            create dump
                        </Text>
                        <Text variant="bodyM" color="secondary" style={styles.subtitle}>
                            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)} • {photoCount} photos
                        </Text>
                    </Animated.View>

                    {/* Selection Mode Cards */}
                    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                        <Text variant="caption" color="tertiary" style={styles.sectionLabel}>
                            HOW DO YOU WANT TO SELECT?
                        </Text>
                        <View style={styles.modeCards}>
                            <SelectionModeCard
                                selected={selectionMode === 'smart'}
                                onPress={() => handleModeSelect('smart')}
                                icon="sparkles"
                                iconColor={colors.accent}
                                title="Smart Selection"
                                description="AI finds the best photos"
                                badge="Recommended"
                                features={[
                                    'Picks your best 10 photos',
                                    'Filters out screenshots',
                                    'Prioritizes great faces'
                                ]}
                            />
                            <SelectionModeCard
                                selected={selectionMode === 'manual'}
                                onPress={() => handleModeSelect('manual')}
                                icon="hand-left-outline"
                                iconColor={colors.textSecondary}
                                title="Manual Selection"
                                description="You pick everything"
                                features={[
                                    'Browse all your photos',
                                    'Select up to 10',
                                    'Full control'
                                ]}
                            />
                        </View>
                    </Animated.View>

                    {/* Date Range Pills */}
                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <Text variant="caption" color="tertiary" style={styles.sectionLabel}>
                            TIME PERIOD
                        </Text>
                        <View style={styles.dateRangePills}>
                            <DatePill
                                title="This Week"
                                selected={selectedType === 'weekly'}
                                onPress={() => handleTypeSelect('weekly')}
                            />
                            <DatePill
                                title="This Month"
                                selected={selectedType === 'monthly'}
                                onPress={() => handleTypeSelect('monthly')}
                            />
                            <DatePill
                                title="Custom"
                                selected={selectedType === 'manual'}
                                onPress={() => handleTypeSelect('manual')}
                            />
                        </View>

                        {/* Custom Date Pickers */}
                        {selectedType === 'manual' && (
                            <View style={styles.customDateRow}>
                                <Pressable onPress={() => openPicker('start')} style={styles.customDateButton}>
                                    <Text variant="caption" color="tertiary">FROM</Text>
                                    <Text variant="bodyS">{formatDate(customStartDate)}</Text>
                                </Pressable>
                                <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                                <Pressable onPress={() => openPicker('end')} style={styles.customDateButton}>
                                    <Text variant="caption" color="tertiary">TO</Text>
                                    <Text variant="bodyS">{formatDate(customEndDate)}</Text>
                                </Pressable>
                            </View>
                        )}
                    </Animated.View>
                </View>

                {/* Continue Button */}
                <Animated.View
                    entering={FadeIn.delay(400).duration(300)}
                    style={[styles.buttonContainer, { paddingBottom: insets.bottom + spacing.xl }]}
                >
                    <Button
                        title={loading ? 'finding photos...' : photoCount > 0 ? "let's go" : "no photos found"}
                        onPress={handleContinue}
                        disabled={loading || photoCount === 0}
                    />
                </Animated.View>
            </ScrollView>

            {/* Custom Date Picker Modal */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                        <View style={styles.modalOverlay}>
                            <Pressable style={styles.backdrop} onPress={() => setShowDatePicker(false)} />
                            <GlassView
                                style={styles.datePickerModal}
                                glassEffectStyle="regular"
                            >
                                <DateTimePicker
                                    value={datePickerTarget === 'start' ? customStartDate : customEndDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                    themeVariant="dark"
                                    locale="en_US"
                                    textColor="white"
                                    style={{ height: 200, width: 320 }}
                                />
                                <Button title="done" onPress={() => setShowDatePicker(false)} style={{ marginTop: spacing.lg, width: '100%' }} />
                            </GlassView>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={datePickerTarget === 'start' ? customStartDate : customEndDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )
            )}

            {/* Tips Modal */}
            <Modal
                visible={showTips}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTips(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.backdrop} onPress={() => setShowTips(false)} />
                    <Animated.View
                        entering={SlideInDown.duration(300)}
                        exiting={SlideOutDown.duration(200)}
                        style={styles.bottomSheet}
                    >
                        <GlassView
                            style={[styles.tipsCard, { paddingBottom: insets.bottom + spacing.xl }]}
                            glassEffectStyle="regular"
                        >
                            <View style={styles.modalHeader}>
                                <Text variant="titleL">pro tips 💡</Text>
                                <Pressable onPress={() => setShowTips(false)}>
                                    <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <View style={styles.tipsList}>
                                <TipItem emoji="🎨" text="the 3-color rule: stick to a consistent palette" />
                                <TipItem emoji="📐" text="mix aspect ratios (16:9 cinematic + 4:5)" />
                                <TipItem emoji="🌫️" text="breathing room: 1 slide of just sky/texture" />
                                <TipItem emoji="🔤" text="text = texture (screenshots/notes app)" />
                                <TipItem emoji="📸" text="flash on + 0.5x mode = elite" />
                                <TipItem emoji="🫣" text="no face pics = added mystery" />
                            </View>

                            <Button
                                title="got it"
                                onPress={() => setShowTips(false)}
                                style={{ marginTop: spacing.lg }}
                            />
                        </GlassView>
                    </Animated.View>
                </View>
            </Modal>
        </GradientBackground>
    );
}

// Selection Mode Card Component
function SelectionModeCard({
    selected,
    onPress,
    icon,
    iconColor,
    title,
    description,
    badge,
    features
}: {
    selected: boolean;
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    description: string;
    badge?: string;
    features: string[];
}) {
    return (
        <Pressable onPress={onPress} style={styles.modeCard}>
            <GlassView
                style={[
                    styles.modeCardInner,
                    selected && styles.modeCardSelected
                ]}
                isInteractive
                glassEffectStyle="clear"
            >
                {/* Badge */}
                {badge && selected && (
                    <View style={styles.modeBadge}>
                        <Text variant="caption" style={styles.modeBadgeText}>{badge}</Text>
                    </View>
                )}

                {/* Icon */}
                <View style={[styles.modeIconContainer, selected && { backgroundColor: `${colors.accent}20` }]}>
                    <Ionicons name={icon} size={28} color={selected ? colors.accent : iconColor} />
                </View>

                {/* Title & Description */}
                <Text variant="titleM" color={selected ? 'primary' : 'secondary'} style={styles.modeTitle}>
                    {title}
                </Text>
                <Text variant="caption" color="tertiary" style={styles.modeDescription}>
                    {description}
                </Text>

                {/* Features */}
                <View style={styles.modeFeatures}>
                    {features.map((feature, i) => (
                        <View key={i} style={styles.modeFeatureRow}>
                            <Ionicons
                                name="checkmark-circle"
                                size={14}
                                color={selected ? colors.accent : colors.textTertiary}
                            />
                            <Text variant="caption" color={selected ? 'secondary' : 'tertiary'} style={{ flex: 1 }}>
                                {feature}
                            </Text>
                        </View>
                    ))}
                </View>
            </GlassView>
        </Pressable>
    );
}

// Date Pill Component
function DatePill({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={onPress}>
            <View style={[styles.datePill, selected && styles.datePillSelected]}>
                <Text variant="bodyS" color={selected ? 'primary' : 'tertiary'}>
                    {title}
                </Text>
            </View>
        </Pressable>
    );
}

function TipItem({ emoji, text }: { emoji: string; text: string }) {
    return (
        <View style={styles.tipRow}>
            <Text style={styles.tipEmoji}>{emoji}</Text>
            <Text variant="bodyM" style={{ flex: 1 }}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        gap: spacing.xl,
        paddingTop: spacing.lg,
    },
    title: {
        textAlign: 'center',
    },
    subtitle: {
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    sectionLabel: {
        letterSpacing: 1,
        marginBottom: spacing.md,
    },

    // Mode Cards
    modeCards: {
        gap: spacing.md,
    },
    modeCard: {
        width: '100%',
    },
    modeCardInner: {
        padding: spacing.lg,
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    modeCardSelected: {
        borderWidth: 1.5,
        borderColor: colors.accent,
    },
    modeBadge: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
    modeBadgeText: {
        color: colors.bg,
        fontWeight: '600',
    },
    modeIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.surface2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modeTitle: {
        marginBottom: spacing.xs,
    },
    modeDescription: {
        marginBottom: spacing.md,
    },
    modeFeatures: {
        gap: spacing.xs,
    },
    modeFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    // Date Pills
    dateRangePills: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    datePill: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surface1,
    },
    datePillSelected: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.borderSoft,
    },
    customDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    customDateButton: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.surface1,
        borderRadius: radius.md,
        alignItems: 'center',
    },

    // Button
    buttonContainer: {
        paddingTop: spacing.xl,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    datePickerModal: {
        margin: spacing.xl,
        padding: spacing.xl,
        borderRadius: radius.xl,
        alignItems: 'center',
        overflow: 'hidden',
    },
    bottomSheet: {
        width: '100%',
    },
    tipsCard: {
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.xl,
        paddingTop: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    tipsList: {
        gap: spacing.sm,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 2,
    },
    tipEmoji: {
        fontSize: 24,
        lineHeight: 30,
        width: 30,
        textAlign: 'center',
    },
});
