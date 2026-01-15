/**
 * Profile Screen - Minimal Premium Design
 * Inspired by Apple's design philosophy: restraint, clarity, depth
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';
import { syncAllDumps } from '../../services/sync';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncAllDumps();
        } finally {
            setIsSyncing(false);
        }
    };

    const displayName = user?.email?.split('@')[0] || 'friend';

    const handleEmailSupport = () => {
        Linking.openURL('mailto:jainmanya2701@gmail.com?subject=Lately Support Request');
    };

    const handlePrivacyPolicy = () => {
        setActiveModal('privacy');
    };

    const handleTerms = () => {
        setActiveModal('terms');
    };

    return (
        <GradientBackground style={styles.screen}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{
                    paddingTop: insets.top + spacing['3xl'],
                    paddingHorizontal: spacing.xl,
                    paddingBottom: 120,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="titleXL" style={styles.greeting}>
                        {displayName}
                    </Text>
                    <Text variant="bodyS" color="secondary" style={styles.email}>
                        {user?.email}
                    </Text>
                </View>

                {/* Pro Card - Minimal & Elegant */}
                <View style={styles.proSection}>
                    <GlassView style={styles.proCard} glassEffectStyle="clear">
                        <View style={styles.proContent}>
                            <View>
                                <View style={styles.proLabelRow}>
                                    <View style={styles.proDot} />
                                    <Text variant="caption" style={styles.proLabel}>
                                        LATELY PRO
                                    </Text>
                                </View>
                                <Text variant="titleM" style={styles.proTitle}>
                                    go premium
                                </Text>
                                <Text variant="bodyS" color="secondary" style={styles.proDescription}>
                                    unlimited exports, no watermarks
                                </Text>
                            </View>
                            <Pressable style={styles.upgradeButton}>
                                <Text style={styles.upgradeButtonText}>upgrade</Text>
                            </Pressable>
                        </View>
                    </GlassView>
                </View>

                {/* Settings Groups */}
                <View style={styles.settingsContainer}>
                    {/* Account */}
                    <View style={styles.settingsGroup}>
                        <Text variant="caption" color="tertiary" style={styles.groupLabel}>
                            ACCOUNT
                        </Text>
                        <GlassView style={styles.settingsCard} glassEffectStyle="clear">
                            <SettingRow
                                icon="cloud-upload-outline"
                                title="sync"
                                value={isSyncing ? 'syncing...' : 'up to date'}
                                onPress={handleSync}
                            />
                            <Divider />
                            <SettingRow
                                icon="notifications-outline"
                                title="notifications"
                                rightElement={
                                    <Switch
                                        value={notifications}
                                        onValueChange={setNotifications}
                                        trackColor={{ false: colors.surface2, true: colors.accentGlow }}
                                        thumbColor={notifications ? colors.accent : colors.textTertiary}
                                        ios_backgroundColor={colors.surface2}
                                    />
                                }
                            />
                        </GlassView>
                    </View>

                    {/* Preferences */}
                    <View style={styles.settingsGroup}>
                        <Text variant="caption" color="tertiary" style={styles.groupLabel}>
                            PREFERENCES
                        </Text>
                        <GlassView style={styles.settingsCard} glassEffectStyle="clear">
                            <SettingRow icon="camera-outline" title="export quality" value="original" />
                            <Divider />
                            <SettingRow icon="color-palette-outline" title="appearance" value="dark" />
                        </GlassView>
                    </View>

                    {/* Support */}
                    <View style={styles.settingsGroup}>
                        <Text variant="caption" color="tertiary" style={styles.groupLabel}>
                            SUPPORT
                        </Text>
                        <GlassView style={styles.settingsCard} glassEffectStyle="clear">
                            <SettingRow
                                icon="mail-outline"
                                title="help center"
                                value="contact us"
                                onPress={handleEmailSupport}
                            />
                            <Divider />
                            <SettingRow
                                icon="shield-checkmark-outline"
                                title="privacy policy"
                                onPress={handlePrivacyPolicy}
                            />
                            <Divider />
                            <SettingRow
                                icon="document-text-outline"
                                title="terms & conditions"
                                onPress={handleTerms}
                            />
                            <Divider />
                            <SettingRow icon="information-circle-outline" title="version" value="1.0.0" />
                        </GlassView>
                    </View>
                </View>

                {/* Sign Out */}
                <Pressable onPress={logout} style={styles.signOutButton}>
                    <Text variant="bodyM" color="secondary">
                        sign out
                    </Text>
                </Pressable>
            </ScrollView>

            {/* Bottom Sheet Modals */}
            <BottomSheet
                visible={activeModal === 'privacy'}
                onClose={() => setActiveModal(null)}
                title="Privacy Policy"
            >
                <View style={styles.modalContent}>
                    <Text variant="caption" color="tertiary" style={styles.modalDate}>
                        Last updated: January 2026
                    </Text>

                    <Text variant="bodyM" style={styles.modalSection}>
                        Your privacy matters to us. Lately is designed with privacy at its core.
                    </Text>

                    <View style={styles.policySection}>
                        <Text variant="bodyM" style={styles.policyTitle}>Data Collection</Text>
                        <Text variant="bodyS" color="secondary" style={styles.policyText}>
                            • We only collect your email address for authentication{"\n"}
                            • Photo analysis happens locally on your device{"\n"}
                            • We don't sell or share your personal data{"\n"}
                            • Your photo dumps are stored securely
                        </Text>
                    </View>

                    <View style={styles.policySection}>
                        <Text variant="bodyM" style={styles.policyTitle}>Your Photos</Text>
                        <Text variant="bodyS" color="secondary" style={styles.policyText}>
                            • Photos never leave your device during analysis{"\n"}
                            • We do not store or have access to your images{"\n"}
                            • Only metadata (scores, tags) is synced to cloud{"\n"}
                            • You can delete your data anytime
                        </Text>
                    </View>

                    <View style={styles.policySection}>
                        <Text variant="bodyM" style={styles.policyTitle}>Third-Party Services</Text>
                        <Text variant="bodyS" color="secondary" style={styles.policyText}>
                            • We use Supabase for authentication and data storage{"\n"}
                            • Analytics are anonymized and minimal
                        </Text>
                    </View>
                </View>
            </BottomSheet>

            <BottomSheet
                visible={activeModal === 'terms'}
                onClose={() => setActiveModal(null)}
                title="Terms & Conditions"
            >
                <View style={styles.modalContent}>
                    <Text variant="caption" color="tertiary" style={styles.modalDate}>
                        Last updated: January 2026
                    </Text>

                    <Text variant="bodyM" style={styles.modalSection}>
                        By using Lately, you agree to be bound by these Terms and Conditions.
                    </Text>

                    <View style={styles.policySection}>
                        <Text variant="bodyM" style={styles.policyTitle}>Acceptable Use</Text>
                        <Text variant="bodyS" color="secondary" style={styles.policyText}>
                            • You must be at least 13 years old to use Lately{"\n"}
                            • You own all content you create{"\n"}
                            • Do not use the app for illegal purposes{"\n"}
                            • Respect others' privacy and content
                        </Text>
                    </View>

                    <View style={styles.policySection}>
                        <Text variant="bodyM" style={styles.policyTitle}>Account & Subscription</Text>
                        <Text variant="bodyS" color="secondary" style={styles.policyText}>
                            • Free tier includes basic features{"\n"}
                            • Pro subscription unlocks premium features{"\n"}
                            • Subscriptions auto-renew unless cancelled{"\n"}
                            • Refunds handled per platform policy (App Store/Play Store)
                        </Text>
                    </View>

                    <View style={styles.policySection}>
                        <Text variant="bodyM" style={styles.policyTitle}>Limitations</Text>
                        <Text variant="bodyS" color="secondary" style={styles.policyText}>
                            • The app is provided "as is"{"\n"}
                            • We are not liable for data loss{"\n"}
                            • Features may change or be discontinued{"\n"}
                            • We reserve the right to suspend accounts violating these Terms
                        </Text>
                    </View>
                </View>
            </BottomSheet>
        </GradientBackground>
    );
}

// Setting Row Component
function SettingRow({
    icon,
    title,
    value,
    onPress,
    rightElement,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
}) {
    return (
        <Pressable onPress={onPress} style={styles.settingRow} disabled={!onPress}>
            <Ionicons name={icon} size={22} color={colors.textSecondary} />
            <Text variant="bodyM" style={styles.settingTitle}>
                {title}
            </Text>
            <View style={styles.settingRight}>
                {value && (
                    <Text variant="bodyS" color="secondary">
                        {value}
                    </Text>
                )}
                {rightElement}
                {onPress && !rightElement && (
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                )}
            </View>
        </Pressable>
    );
}

function Divider() {
    return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        marginBottom: spacing['4xl'],
    },
    greeting: {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: -1,
        marginBottom: spacing.xs,
    },
    email: {
        opacity: 0.6,
    },
    proSection: {
        marginBottom: spacing['4xl'],
    },
    proCard: {
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    proContent: {
        padding: spacing['2xl'],
        gap: spacing.xl,
    },
    proLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.sm,
    },
    proDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent,
    },
    proLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 1.2,
    },
    proTitle: {
        marginBottom: spacing.xs,
        letterSpacing: -0.5,
    },
    proDescription: {
        lineHeight: 20,
        opacity: 0.7,
    },
    upgradeButton: {
        backgroundColor: colors.accent,
        height: 48,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    upgradeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.bg,
        letterSpacing: -0.3,
    },
    settingsContainer: {
        gap: spacing['3xl'],
    },
    settingsGroup: {
        gap: spacing.md,
    },
    groupLabel: {
        fontSize: 11,
        letterSpacing: 1.5,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    settingsCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        minHeight: 56,
    },
    settingTitle: {
        flex: 1,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.borderSoft,
        marginLeft: spacing.lg + 22 + spacing.md,
    },
    signOutButton: {
        alignSelf: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing['3xl'],
        marginTop: spacing['2xl'],
    },
    modalContent: {
        paddingVertical: spacing.md,
    },
    modalDate: {
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    modalSection: {
        lineHeight: 24,
        marginBottom: spacing.xl,
    },
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.surface1,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        marginBottom: spacing.md,
    },
    emailButtonText: {
        flex: 1,
    },
    modalFooter: {
        marginTop: spacing.lg,
        textAlign: 'center',
    },
    policySection: {
        marginBottom: spacing['2xl'],
    },
    policyTitle: {
        fontWeight: '700',
        marginBottom: spacing.md,
        fontSize: 16,
    },
    policyText: {
        lineHeight: 22,
        marginBottom: spacing.sm,
    },
});
