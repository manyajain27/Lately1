/**
 * Sign Up Screen
 * Email/password registration
 */

import { GlassView } from 'expo-glass-effect';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Input, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';

export default function SignUpScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { signUp, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSignUp = async () => {
        if (!email || !password || !confirmPassword) {
            setError('please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('password must be at least 6 characters');
            return;
        }

        setError('');
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
            setError(signUpError.toLowerCase());
        }
    };

    return (
        <GradientBackground>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text variant="titleXL" style={styles.title}>create account</Text>
                        <Text variant="bodyM" color="secondary" style={styles.subtitle}>
                            start creating beautiful photo dumps
                        </Text>
                    </View>

                    {/* Sign Up Form */}
                    <GlassView style={styles.form} isInteractive glassEffectStyle='clear'>
                        <Input
                            label="email"
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />
                        <Input
                            label="password"
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="new-password"
                        />
                        <Input
                            label="confirm password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoComplete="new-password"
                        />

                        {error ? (
                            <Text variant="caption" style={styles.error}>{error}</Text>
                        ) : null}

                        <Button
                            title="create account"
                            onPress={handleSignUp}
                            loading={isLoading}
                            style={styles.button}
                        />

                        <View style={styles.footer}>
                            <Text variant="bodyS" color="secondary">
                                already have an account?{' '}
                            </Text>
                            <Link href="/(auth)/login" asChild>
                                <Pressable>
                                    <Text variant="bodyS" color="accent" style={styles.link}>
                                        sign in
                                    </Text>
                                </Pressable>
                            </Link>
                        </View>
                    </GlassView>
                </View>
            </KeyboardAvoidingView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing['4xl'],
    },
    title: {
        marginBottom: spacing.sm,
    },
    subtitle: {
        textAlign: 'center',
    },
    form: {
        padding: spacing.xl,
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    error: {
        color: colors.danger,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    link: {
        fontWeight: '600',
    },
});
