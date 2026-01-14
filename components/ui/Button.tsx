/**
 * Button Component
 * Premium button with Skia gradients and Reanimated animations
 */

import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { animation, colors, layout, radius, shadows } from '../../constants/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'small';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
    haptic?: boolean;
    height?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'default',
    disabled = false,
    loading = false,
    style,
    haptic = true,
    height: customHeight,
}: ButtonProps) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const height = customHeight ?? (size === 'small' ? layout.buttonHeightSmall : layout.buttonHeight);
    const buttonRadius = size === 'small' ? radius.md : radius.lg;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(animation.pressScale, animation.spring);
        opacity.value = withSpring(animation.pressOpacity, animation.spring);
        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [haptic, scale, opacity]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, animation.spring);
        opacity.value = withSpring(1, animation.spring);
    }, [scale, opacity]);

    const handlePress = useCallback(() => {
        if (disabled || loading) return;
        onPress();
    }, [disabled, loading, onPress]);

    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isGhost = variant === 'ghost';

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled || loading}
            style={[
                styles.container,
                { height, borderRadius: buttonRadius },
                isSecondary && styles.secondaryContainer,
                isGhost && styles.ghostContainer,
                isPrimary && shadows.glow,
                disabled && styles.disabled,
                animatedStyle,
                style,
            ]}
        >
            {/* Primary gradient background using Skia */}
            {isPrimary && (
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { borderRadius: buttonRadius, overflow: 'hidden' }]}
                >
                    <Canvas style={StyleSheet.absoluteFill}>
                        <RoundedRect x={0} y={0} width={400} height={height} r={buttonRadius}>
                            <LinearGradient
                                start={vec(0, 0)}
                                end={vec(0, height)}
                                colors={[colors.accent, colors.accentMuted]}
                            />
                        </RoundedRect>
                    </Canvas>
                </View>
            )}

            <Text
                variant={size === 'small' ? 'bodyS' : 'bodyM'}
                color={isPrimary ? 'primary' : isGhost ? 'secondary' : 'primary'}
                style={[
                    styles.text,
                    isPrimary && styles.primaryText,
                ]}
            >
                {loading ? '...' : title}
            </Text>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        overflow: 'hidden',
    },
    secondaryContainer: {
        backgroundColor: colors.surface1,
        borderWidth: 1,
        borderColor: colors.borderSoft,
    },
    ghostContainer: {
        backgroundColor: 'transparent',
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        textAlign: 'center',
    },
    primaryText: {
        color: colors.bg,
        fontWeight: '600',
    },
});

export default Button;
