/**
 * Create Dump - Start Screen
 * 
 * Entry point for dump creation - shows options and starts the flow
 * Matches the design reference aesthetic
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

// Get current month name
function getCurrentMonthName(): string {
    return new Date().toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
}

export default function CreateScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
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

    // Auto-open tips
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTips(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

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
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={styles.header}
                >
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
                            let's create your dump 📸
                        </Text>
                        <Text variant="bodyM" color="secondary" style={styles.subtitle}>
                            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                        </Text>
                    </Animated.View>

                    {/* Stats Card */}
                    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                        <GlassView style={styles.statsCard} isInteractive glassEffectStyle="clear">
                            <View style={styles.statRow}>
                                <View style={[styles.stat, { opacity: loading ? 0.4 : 1 }]}>
                                    <Text variant="titleXL">{photoCount}</Text>
                                    <Text variant="bodyS" color="secondary">photos found</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text variant="titleXL">10</Text>
                                    <Text variant="bodyS" color="secondary">will be picked</Text>
                                </View>
                            </View>
                        </GlassView>
                    </Animated.View>

                    {/* Type Selection */}
                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <Text variant="caption" color="tertiary" style={styles.sectionLabel}>
                            QUICK SELECT
                        </Text>
                        <View style={styles.typeOptions}>
                            <TypeOption
                                icon="calendar-outline"
                                title="this week"
                                subtitle="last 7 days"
                                selected={selectedType === 'weekly'}
                                onPress={() => handleTypeSelect('weekly')}
                            />
                            <TypeOption
                                icon="calendar"
                                title="this month"
                                subtitle={getCurrentMonthName()}
                                selected={selectedType === 'monthly'}
                                onPress={() => handleTypeSelect('monthly')}
                            />
                            <TypeOption
                                icon="options-outline"
                                title="custom"
                                subtitle="pick dates"
                                selected={selectedType === 'manual'}
                                onPress={() => handleTypeSelect('manual')}
                            >
                                {selectedType === 'manual' && (
                                    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                                        <Pressable
                                            onPress={() => openPicker('start')}
                                            style={{ flex: 1, padding: spacing.md, backgroundColor: colors.surface2, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Text variant="caption" color="secondary" style={{ marginBottom: 2 }}>FROM</Text>
                                            <Text variant="bodyS" style={{ fontWeight: '600' }}>{formatDate(customStartDate)}</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => openPicker('end')}
                                            style={{ flex: 1, padding: spacing.md, backgroundColor: colors.surface2, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Text variant="caption" color="secondary" style={{ marginBottom: 2 }}>TO</Text>
                                            <Text variant="bodyS" style={{ fontWeight: '600' }}>{formatDate(customEndDate)}</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </TypeOption>
                        </View>
                    </Animated.View>

                    {/* How it works */}
                    <Animated.View
                        entering={FadeIn.delay(400).duration(400)}
                        style={styles.howItWorks}
                    >
                        <Text variant="caption" color="tertiary" style={styles.howItWorksText}>
                            ✨ ai analyzes your photos → picks the best ones → you customize → export
                        </Text>
                    </Animated.View>
                </View>

                {/* Start Button */}
                <Animated.View
                    entering={FadeIn.delay(500).duration(300)}
                    style={[styles.buttonContainer, { paddingBottom: insets.bottom + spacing.xl }]}
                >
                    <Button
                        title={photoCount > 0 ? "let's go" : "no photos found"}
                        onPress={handleContinue}
                        disabled={loading || photoCount === 0}
                        style={{ opacity: loading ? 0.8 : 1 }}
                    />
                </Animated.View>
            </ScrollView>

            {/* Custom Date Picker */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                        <View style={styles.modalOverlay}>
                            <Pressable style={styles.backdrop} onPress={() => setShowDatePicker(false)} />
                            <GlassView
                                style={{ margin: spacing.xl, padding: spacing.xl, borderRadius: radius.xl, alignItems: 'center', overflow: 'hidden' }}
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
                                <TipItem emoji="⚡" text="the messy break: one chaos shot mid-dump" />
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

function TipItem({ emoji, text }: { emoji: string; text: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 2 }}>
            <Text style={{ fontSize: 24, lineHeight: 30, width: 30, textAlign: 'center' }}>{emoji}</Text>
            <Text variant="bodyM">{text}</Text>
        </View>
    );
}

// Type option component
function TypeOption({
    icon,
    title,
    subtitle,
    selected,
    onPress,
    children,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    selected: boolean;
    onPress: () => void;
    children?: React.ReactNode;
}) {
    return (
        <Pressable onPress={onPress} style={styles.typeOption}>
            <GlassView
                style={[
                    styles.typeOptionCard,
                    selected && styles.typeOptionSelected
                ]}
                isInteractive
                glassEffectStyle="clear"
            >
                <Ionicons
                    name={icon}
                    size={28}
                    color={selected ? colors.accent : colors.textSecondary}
                />
                <Text variant="bodyM" color={selected ? 'accent' : 'primary'}>
                    {title}
                </Text>
                <Text variant="caption" color="tertiary">
                    {subtitle}
                </Text>
                {children}
            </GlassView>
        </Pressable>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        justifyContent: 'center',
        gap: spacing.xl,
    },
    title: {
        textAlign: 'center',
    },
    subtitle: {
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    statsCard: {
        padding: spacing.xl,
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.borderSoft,
    },
    sectionLabel: {
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    typeOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    typeOption: {
        flex: 1,
    },
    typeOptionCard: {
        padding: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        gap: spacing.xs,
        overflow: 'hidden',
    },
    typeOptionSelected: {
        borderWidth: 1.5,
        borderColor: colors.accent,
    },
    howItWorks: {
        paddingHorizontal: spacing.md,
    },
    howItWorksText: {
        textAlign: 'center',
    },
    buttonContainer: {
        paddingTop: spacing.xl,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
        gap: spacing.sm, // Reduced gap
    },
});
