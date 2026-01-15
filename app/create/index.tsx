/**
 * Create Dump - Start Screen
 * 
 * Design: Editorial w/ Premium Images
 * - VISUAL FIRST: Large, stunning image cards for modes.
 * - Magazine-style typography overlays.
 * - Spacious Layout (Restored).
 * - FAB: White Skia Gradient.
 * - Fixed Date Picker (Centered Modal + Year).
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { SkiaOverlay } from '../../components/ui/SkiaGradient';
import { colors, radius, spacing } from '../../constants/theme';
import { PhotosService } from '../../services/photos';
import { DumpType } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format date for display (Includes Year)
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type SelectionMode = 'smart' | 'manual';

export default function CreateScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectionMode, setSelectionMode] = useState<SelectionMode>('smart');
    const [selectedType, setSelectedType] = useState<DumpType>('weekly');
    const [loading, setLoading] = useState(true);
    const [photoCount, setPhotoCount] = useState(0);
    const [showTips, setShowTips] = useState(false);

    // Custom Date Picker
    const [customStartDate, setCustomStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end'>('start');

    const dateRange = useMemo(() => {
        if (selectedType === 'manual') return { startDate: customStartDate, endDate: customEndDate };
        const endDate = new Date();
        const startDate = new Date();
        if (selectedType === 'weekly') startDate.setDate(endDate.getDate() - 7);
        else if (selectedType === 'monthly') startDate.setDate(1);
        else startDate.setDate(endDate.getDate() - 7);
        return { startDate, endDate };
    }, [selectedType, customStartDate, customEndDate]);

    useEffect(() => {
        async function fetchPhotos() {
            try {
                setLoading(true);
                const hasPermission = await PhotosService.requestPermissions();
                if (!hasPermission) { setLoading(false); return; }
                const photos = await PhotosService.getPhotosInDateRange(dateRange.startDate, dateRange.endDate);
                setPhotoCount(photos.length);
            } catch (e) { } finally { setLoading(false); }
        }
        fetchPhotos();
    }, [dateRange]);

    const handleModeSelect = (mode: SelectionMode) => {
        Haptics.selectionAsync();
        setSelectionMode(mode);
        if (mode === 'manual') setShowTips(true);
    };

    const handleTypeSelect = (type: DumpType) => {
        Haptics.selectionAsync();
        setSelectedType(type);
    };

    const handleContinue = async () => {
        if (photoCount === 0) { Alert.alert('no photos', 'no photos found.'); return; }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: '/create/select',
            params: { type: selectedType, selectionMode, startDate: dateRange.startDate.getTime(), endDate: dateRange.endDate.getTime() }
        });
    };

    const openPicker = (target: 'start' | 'end') => { setDatePickerTarget(target); setShowDatePicker(true); Haptics.selectionAsync(); };

    // Date change handler
    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
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

    return (
        <GradientBackground>
            <View style={[styles.headerActions, { marginTop: insets.top }]}>
                <Pressable onPress={() => router.replace('/(tabs)')} style={styles.iconButton}>
                    <Ionicons name="close" size={28} color="white" />
                </Pressable>
                <Pressable onPress={() => setShowTips(true)} style={styles.iconButton}>
                    <Ionicons name="information-circle-outline" size={28} color="white" />
                </Pressable>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Title Section */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.titleSection}>
                    <Text variant="titleXL" style={styles.pageTitle}>create dump.</Text>
                    <Text variant="bodyM" color="tertiary" style={styles.subtitle}>{photoCount} photos available</Text>
                </Animated.View>

                {/* VISUAL CARDS FOR MODES */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.cardsContainer}>
                    <VisualModeCard
                        title="smart select"
                        subtitle="ai curation"
                        image="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop"
                        selected={selectionMode === 'smart'}
                        onPress={() => handleModeSelect('smart')}
                    />
                    <VisualModeCard
                        title="manual select"
                        subtitle="total control"
                        image="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop"
                        selected={selectionMode === 'manual'}
                        onPress={() => handleModeSelect('manual')}
                    />
                </Animated.View>

                {/* Time Selection */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.timeSection}>
                    <Text variant="caption" color="tertiary" style={styles.sectionTitle}>TIMELINE</Text>
                    <View style={styles.timeOptions}>
                        <TimeOption title="this week" selected={selectedType === 'weekly'} onPress={() => handleTypeSelect('weekly')} />
                        <TimeOption title="this month" selected={selectedType === 'monthly'} onPress={() => handleTypeSelect('monthly')} />
                        <TimeOption title="custom" selected={selectedType === 'manual'} onPress={() => handleTypeSelect('manual')} />
                    </View>

                    {selectedType === 'manual' && (
                        <View style={styles.customDateDisplay}>
                            <Pressable onPress={() => openPicker('start')} style={styles.dateTouchArea}>
                                <Text variant="titleM" style={{ fontSize: 13 }}>start</Text>
                                <Text variant="titleM">{formatDate(customStartDate)}</Text>
                            </Pressable>

                            <Ionicons name="arrow-forward" size={16} color="gray" />

                            <Pressable onPress={() => openPicker('end')} style={styles.dateTouchArea}>
                                <Text variant="titleM" style={{ fontSize: 13, textAlign: 'right' }}>end</Text>
                                <Text variant="titleM">{formatDate(customEndDate)}</Text>
                            </Pressable>
                        </View>
                    )}
                </Animated.View>

                {/* Continue FAB (Reverted to Skia + No Load State) */}
                <Animated.View entering={FadeIn.delay(400)} style={[styles.fabContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <Pressable
                        onPress={handleContinue}
                        disabled={loading || photoCount === 0}
                        style={({ pressed }) => [styles.fab, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                    >
                        <SkiaOverlay colors={[colors.textPrimary, '#CCCCCC']} style={StyleSheet.absoluteFillObject} />
                        <Text style={[styles.fabText, { color: 'black' }]}>let's go</Text>
                        {/* Removed spinner, kept arrow stable */}
                        <Ionicons name="arrow-forward" size={20} color="black" />
                    </Pressable>
                </Animated.View>

            </ScrollView>

            {/* Custom Date Picker Modal (Centered) */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                        <View style={styles.centeredModalOverlay}>
                            <Pressable style={styles.backdrop} onPress={() => setShowDatePicker(false)} />
                            <GlassView style={styles.datePickerModal} glassEffectStyle="regular">
                                <View style={styles.modalHeader}>
                                    <Text variant="titleM">{datePickerTarget === 'start' ? 'Start Date' : 'End Date'}</Text>
                                </View>
                                <DateTimePicker
                                    value={datePickerTarget === 'start' ? customStartDate : customEndDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                    themeVariant="dark"
                                    locale="en_US"
                                    textColor="white"
                                    style={{ height: 180, width: '100%' }}
                                />
                                <Button title="done" onPress={() => setShowDatePicker(false)} style={{ marginTop: spacing.md, width: '100%' }} />
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
            <Modal visible={showTips} transparent animationType="fade" onRequestClose={() => setShowTips(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.backdrop} onPress={() => setShowTips(false)} />
                    <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown.duration(200)} style={styles.bottomSheet}>
                        <GlassView style={[styles.tipsCard, { paddingBottom: insets.bottom + spacing.xl }]} glassEffectStyle="regular">
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
                            <Button title="got it" onPress={() => setShowTips(false)} style={{ marginTop: spacing.lg }} />
                        </GlassView>
                    </Animated.View>
                </View>
            </Modal>
        </GradientBackground>
    );
}

function VisualModeCard({ title, subtitle, image, selected, onPress }: any) {
    return (
        <Pressable onPress={onPress} style={[styles.visualCard, selected && styles.visualCardSelected]}>
            <Image
                source={{ uri: image }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={300}
            />
            {/* Dark Gradient Overlay */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: selected ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)' }]} />

            {/* Selection Border (Inner) */}
            {selected && <View style={[StyleSheet.absoluteFillObject, { borderWidth: 2, borderColor: colors.accent, borderRadius: radius.xl }]} />}

            <View style={styles.cardContent}>
                <Text variant="titleL" style={styles.cardTitle}>{title}</Text>
                <Text variant="bodyS" style={styles.cardSubtitle}>{subtitle}</Text>
            </View>

            {/* Checkmark Badge */}
            {selected && (
                <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="black" />
                </View>
            )}
        </Pressable>
    )
}

function TimeOption({ title, selected, onPress }: any) {
    return (
        <Pressable onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
            <Text variant="bodyS" style={{ color: selected ? 'black' : 'white', fontWeight: '600' }}>{title}</Text>
        </Pressable>
    )
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
    container: { flex: 1 },
    content: { paddingHorizontal: spacing.md, paddingBottom: 100 },

    // Header Actions (Floating)
    headerActions: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: spacing.sm, paddingBottom: spacing.sm,
    },
    iconButton: { padding: spacing.sm },

    titleSection: { marginBottom: spacing.xl, paddingHorizontal: spacing.sm, marginTop: spacing.sm },
    pageTitle: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
    subtitle: { marginTop: 4 },

    cardsContainer: { gap: spacing.md },
    visualCard: {
        height: 160, borderRadius: radius.xl, overflow: 'hidden',
        justifyContent: 'flex-end', padding: spacing.lg
    },
    visualCardSelected: { transform: [{ scale: 1.02 }] },

    cardContent: { zIndex: 2 },
    cardTitle: { color: 'white', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
    cardSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 2, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 },

    checkBadge: {
        position: 'absolute', top: 16, right: 16,
        backgroundColor: colors.accent, borderRadius: 12, width: 24, height: 24,
        alignItems: 'center', justifyContent: 'center'
    },

    timeSection: { marginTop: spacing['2xl'], paddingHorizontal: spacing.sm },
    sectionTitle: { marginBottom: spacing.md, letterSpacing: 1 },
    timeOptions: { flexDirection: 'row', gap: spacing.sm },
    pill: {
        paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
    },
    pillSelected: { backgroundColor: colors.accent, borderColor: colors.accent },

    // REVISED CUSTOM DATE STYLES
    customDateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    dateTouchArea: {
        alignItems: 'flex-start',
    },

    fabContainer: { alignItems: 'center', marginTop: spacing['2xl'] },
    fab: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30,
        overflow: 'hidden'
    },
    fabText: { fontWeight: '700', fontSize: 16 },

    // Modals
    modalOverlay: { flex: 1, justifyContent: 'flex-end', zIndex: 1000 },
    centeredModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    bottomSheet: { width: '100%' },
    tipsCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingTop: spacing.lg },
    datePickerModal: { width: '90%', borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center' }, // Removed marginBottom: 400
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    tipsList: { gap: spacing.lg },
    tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    tipEmoji: { fontSize: 24, width: 30, textAlign: 'center' },
});
