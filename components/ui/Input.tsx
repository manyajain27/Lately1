/**
 * Input Component
 * Styled text input with glass effect
 */

import React, { useState } from 'react';
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { animation, colors, radius, spacing, typography } from '../../constants/theme';
import { Text } from './Text';

interface InputProps extends Omit<TextInputProps, 'style'> {
    label?: string;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
    label,
    error,
    containerStyle,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const borderOpacity = useSharedValue(0);

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderColor: `rgba(167, 139, 250, ${borderOpacity.value})`,
    }));

    const handleFocus = (e: any) => {
        setIsFocused(true);
        borderOpacity.value = withSpring(0.6, animation.spring);
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        borderOpacity.value = withSpring(0, animation.spring);
        onBlur?.(e);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text variant="caption" color="secondary" style={styles.label}>
                    {label}
                </Text>
            )}
            <Animated.View
                style={[
                    styles.inputContainer,
                    error && styles.inputError,
                    animatedBorderStyle,
                ]}
            >
                <TextInput
                    style={styles.input}
                    placeholderTextColor={colors.textDisabled}
                    selectionColor={colors.accent}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
            </Animated.View>
            {error && (
                <Text variant="caption" style={styles.errorText}>
                    {error}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    label: {
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    inputContainer: {
        backgroundColor: colors.surface1,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        overflow: 'hidden',
    },
    input: {
        height: 52,
        paddingHorizontal: spacing.lg,
        color: colors.textPrimary,
        fontSize: typography.bodyM.fontSize,
        fontWeight: '500',
    },
    inputError: {
        borderColor: colors.danger,
    },
    errorText: {
        color: colors.danger,
        marginTop: spacing.xs,
        marginLeft: spacing.xs,
    },
});

export default Input;
