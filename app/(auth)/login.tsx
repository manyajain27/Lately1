/**
 * Login Screen
 * Email/password authentication
 */

import { GlassView } from 'expo-glass-effect';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GradientBackground, Input, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../lib/hooks';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const { signIn, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('please fill in all fields');
            return;
        }

        setError('');
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
            setError(signInError.toLowerCase());
        }
    };

    return (
        <GradientBackground>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
                    {/* Logo / Title */}
                    <View style={styles.header}>
                        <Text variant="titleXL" style={styles.title}>lately</Text>
                        <Text variant="bodyM" color="secondary" style={styles.subtitle}>
                            your photos, beautifully curated
                        </Text>
                    </View>

                    {/* Login Form */}
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
                            autoComplete="password"
                        />

                        {error ? (
                            <Text variant="caption" style={styles.error}>{error}</Text>
                        ) : null}

                        <Button
                            title="sign in"
                            onPress={handleLogin}
                            loading={isLoading}
                            style={styles.button}
                        />

                        <View style={styles.footer}>
                            <Text variant="bodyS" color="secondary">
                                don't have an account?{' '}
                            </Text>
                            <Link href="/(auth)/signup" asChild>
                                <Pressable>
                                    <Text variant="bodyS" color="accent" style={styles.link}>
                                        sign up
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
