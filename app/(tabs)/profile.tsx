
import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Text } from '../../components/ui';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';
import { getSyncStatus, syncAllDumps } from '../../services/sync';

interface SettingsRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
}

function SettingsRow({ icon, title, subtitle, onPress, rightElement }: SettingsRowProps) {
    return (
        <Pressable onPress={onPress} disabled={!onPress}>
            <View style={styles.settingsRow}>
                <View style={styles.settingsRowIcon}>
                    <Ionicons name={icon} size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.settingsRowContent}>
                    <Text variant="bodyM" style={styles.settingTitle}>{title}</Text>
                    {subtitle && <Text variant="caption" style={styles.settingSubtitle}>{subtitle}</Text>}
                </View>
                {rightElement || (onPress && (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                ))}
            </View>
        </Pressable>
    );
}

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [lastSyncResult, setLastSyncResult] = useState<string>('never synced');
    const [pendingUploads, setPendingUploads] = useState(0);

    // Check sync status on mount
    useEffect(() => {
        getSyncStatus().then(status => {
            setPendingUploads(status.pendingUploads);
        });
    }, []);

    // Sync icon rotation animation
    const rotation = useSharedValue(0);
    const animatedSyncStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const handleSync = async () => {
        setIsSyncing(true);
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );

        try {
            const result = await syncAllDumps();
            setLastSyncResult(`synced ${result.success} dumps`);
            setPendingUploads(result.failed);
        } catch (e) {
            setLastSyncResult('sync failed');
        } finally {
            setIsSyncing(false);
            rotation.value = 0;
        }
    };

    return (
        <GradientBackground style={styles.screen}>
            <View style={styles.gradientLayer} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="titleXL" style={styles.title}>profile</Text>
                </View>

                {/* Pro Banner */}
                <GlassView style={styles.proBanner} isInteractive>
                    <View style={styles.proBannerContent}>
                        <View style={styles.proIconContainer}>
                            <Ionicons name="diamond" size={24} color={colors.accent} />
                        </View>
                        <View style={styles.proBannerText}>
                            <Text variant="bodyL" style={styles.proTitle}>unlock lately pro</Text>
                            <Text variant="caption" style={styles.proSubtitle}>
                                remove watermarks, unlimited exports
                            </Text>
                        </View>
                    </View>
                    <Button
                        title="upgrade"
                        size="small"
                        onPress={() => { }}
                    />
                </GlassView>

                {/* User Info */}
                <GlassView style={styles.userCard} isInteractive>
                    <View style={styles.avatar}>
                        <Text variant="titleL" style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || 'U'}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text variant="bodyL" style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                        <Text variant="caption" style={styles.userPlan}>free plan</Text>
                    </View>
                </GlassView>

                {/* Sync Section */}
                <View style={styles.section}>
                    <Text variant="titleM" style={styles.sectionTitle}>sync</Text>
                    <GlassView style={styles.settingsGroup} isInteractive>
                        <Pressable onPress={handleSync} disabled={isSyncing}>
                            <View style={styles.settingsRow}>
                                <View style={styles.settingsRowIcon}>
                                    <Animated.View style={animatedSyncStyle}>
                                        <Ionicons name="sync" size={20} color={colors.textSecondary} />
                                    </Animated.View>
                                </View>
                                <View style={styles.settingsRowContent}>
                                    <Text variant="bodyM" style={styles.settingTitle}>sync to cloud</Text>
                                    <Text variant="caption" style={styles.settingSubtitle}>
                                        {isSyncing ? 'syncing...' : 'last synced: never'}
                                    </Text>
                                </View>
                                {!isSyncing && (
                                    <Text variant="caption" color="accent">sync now</Text>
                                )}
                            </View>
                        </Pressable>
                    </GlassView>
                </View>

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text variant="titleM" style={styles.sectionTitle}>settings</Text>
                    <GlassView style={styles.settingsGroup} isInteractive>
                        <SettingsRow
                            icon="notifications-outline"
                            title="notifications"
                            subtitle="weekly dump reminders"
                            rightElement={
                                <Switch
                                    value={notifications}
                                    onValueChange={setNotifications}
                                    trackColor={{ false: colors.surface2, true: colors.accent }}
                                    thumbColor={notifications ? colors.bg : colors.textTertiary}
                                />
                            }
                        />
                        <View style={styles.divider} />
                        <SettingsRow
                            icon="image-outline"
                            title="export quality"
                            subtitle="high (original)"
                            onPress={() => { }}
                        />
                        <View style={styles.divider} />
                        <SettingsRow
                            icon="grid-outline"
                            title="default ratio"
                            subtitle="instagram square (1:1)"
                            onPress={() => { }}
                        />
                    </GlassView>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text variant="titleM" style={styles.sectionTitle}>about</Text>
                    <GlassView style={styles.settingsGroup} isInteractive>
                        <SettingsRow
                            icon="help-circle-outline"
                            title="help & support"
                            onPress={() => { }}
                        />
                        <View style={styles.divider} />
                        <SettingsRow
                            icon="document-text-outline"
                            title="privacy policy"
                            onPress={() => { }}
                        />
                        <View style={styles.divider} />
                        <SettingsRow
                            icon="information-circle-outline"
                            title="version"
                            subtitle="1.0.0"
                        />
                    </GlassView>
                </View>

                {/* Logout */}
                <Button
                    title="sign out"
                    variant="ghost"
                    onPress={logout}
                    style={styles.logoutButton}
                />

                <View style={{ height: 100 }} />
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    gradientLayer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.6,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    title: {
        letterSpacing: -0.3,
    },
    proBanner: {
        marginHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: spacing.xl,
        borderRadius: 18,
        backgroundColor: colors.surface1,
        borderWidth: 0.5,
        borderColor: colors.borderSoft,
        overflow: 'hidden',
    },
    proBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    proIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.surface1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    proBannerText: {
        flex: 1,
    },
    proTitle: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    proSubtitle: {
        color: colors.textSecondary,
    },
    userCard: {
        marginHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: spacing.md,
        marginBottom: spacing.xl,
        borderRadius: 18,
        backgroundColor: colors.surface1,
        borderWidth: 0.5,
        borderColor: colors.borderSoft,
        overflow: 'hidden',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: colors.bg,
    },
    userInfo: {
        flex: 1,
    },
    userEmail: {
        color: colors.textPrimary,
    },
    userPlan: {
        color: colors.textSecondary,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        marginBottom: spacing.md,
        letterSpacing: -0.3,
    },
    settingsGroup: {
        padding: 0,
        borderRadius: 18,
        backgroundColor: colors.surface1,
        borderWidth: 0.5,
        borderColor: colors.borderSoft,
        overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: spacing.md,
    },
    settingsRowIcon: {
        width: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsRowContent: {
        flex: 1,
    },
    settingTitle: {
        color: colors.textPrimary,
    },
    settingSubtitle: {
        color: colors.textSecondary,
    },
    divider: {
        height: 0.5,
        backgroundColor: colors.borderSoft,
        marginLeft: 64, // 16 (padding) + 28 (icon) + 16 (gap) approx
    },
    logoutButton: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
});
