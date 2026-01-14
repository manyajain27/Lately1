/**
 * Text Component
 * Themed text with variant support
 */

import React from 'react';
import { Text as RNText, StyleProp, StyleSheet, TextStyle } from 'react-native';
import { colors, typography } from '../../constants/theme';

type TextVariant = 'titleXL' | 'titleL' | 'titleM' | 'bodyL' | 'bodyM' | 'bodyS' | 'caption';
type TextColor = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'accent';

interface TextProps {
    children: React.ReactNode;
    variant?: TextVariant;
    color?: TextColor;
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
    selectable?: boolean;
}

const colorMap: Record<TextColor, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    disabled: colors.textDisabled,
    accent: colors.accent,
};

export function Text({
    children,
    variant = 'bodyM',
    color = 'primary',
    style,
    numberOfLines,
    selectable = false,
}: TextProps) {
    const variantStyle = typography[variant];
    const textColor = colorMap[color];

    return (
        <RNText
            style={[
                styles.base,
                variantStyle,
                { color: textColor },
                style,
            ]}
            numberOfLines={numberOfLines}
            selectable={selectable}
        >
            {children}
        </RNText>
    );
}

const styles = StyleSheet.create({
    base: {
        fontFamily: typography.fontFamily,
    },
});

export default Text;
