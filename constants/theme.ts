/**
 * Lately Design System
 * iOS 26 inspired premium dark theme with plum accents
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// BASE PALETTE
// ============================================================================
export const palette = {
    black: '#000000',
    plum900: '#502F4C',
    plum700: '#70587C',
    lavender200: '#C8B8DB',
    blush50: '#F9F4F5',
    white: '#FFFFFF',
} as const;

// ============================================================================
// SEMANTIC COLORS
// ============================================================================
export const colors = {
    // Backgrounds
    bg: '#000000', // Deep black
    bgElevated: 'rgba(255, 255, 255, 0.03)', // Very subtle lift
    bgGradientTop: '#000000',
    bgGradientBottom: '#000000',

    // Surfaces (Premium Glass)
    surface0: 'rgba(255, 255, 255, 0.02)',
    surface1: 'rgba(255, 255, 255, 0.05)', // Main card bg
    surface2: 'rgba(255, 255, 255, 0.08)', // Elevated elements

    // Text hierarchy
    textPrimary: '#FFFFFF', // Pure white
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.45)', // Subtle labels
    textDisabled: 'rgba(255, 255, 255, 0.2)',

    // Accent (Opal-esque)
    accent: '#4FF0B7', // Cyan/Teal glow
    accentMuted: 'rgba(79, 240, 183, 0.5)',
    accentGlow: 'rgba(79, 240, 183, 0.25)',

    // Borders (Minimal/Clean)
    borderSoft: 'rgba(255, 255, 255, 0.06)',
    borderMedium: 'rgba(255, 255, 255, 0.12)',

    // Status colors (Vibrant)
    success: '#4FF0B7',
    danger: '#FF4757',
    warning: '#FFA502',

    // Glass effect colors
    glassBackground: 'rgba(20, 20, 20, 0.4)', // Darker native glass base
    glassBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const typography = {
    // Font family - uses system font (SF Pro on iOS)
    fontFamily: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
    }),

    // Type scale
    titleXL: {
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
    },
    titleL: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
    },
    titleM: {
        fontSize: 20,
        lineHeight: 26,
        fontWeight: '600' as const,
        letterSpacing: -0.3,
    },
    bodyL: {
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '500' as const,
        letterSpacing: -0.1,
    },
    bodyM: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500' as const,
        letterSpacing: -0.1,
    },
    bodyS: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500' as const,
        letterSpacing: -0.1,
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500' as const,
        letterSpacing: 0,
    },
} as const;

// ============================================================================
// SPACING
// ============================================================================
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
} as const;

// ============================================================================
// RADIUS
// ============================================================================
export const radius = {
    sm: 12,
    md: 18,
    lg: 24, // Premium curve (Opal style)
    xl: 32,
    '2xl': 40,
    full: 999,
} as const;

// ============================================================================
// SHADOWS (iOS-style subtle elevation)
// ============================================================================
export const shadows = {
    soft: {
        shadowColor: palette.black,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    medium: {
        shadowColor: palette.black,
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
    },
    glow: {
        shadowColor: colors.accent,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
} as const;

// ============================================================================
// ANIMATION
// ============================================================================
export const animation = {
    // Timing
    fast: 220,
    normal: 320,
    slow: 420,

    // Spring configs for reanimated
    spring: {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
    },
    springBouncy: {
        damping: 12,
        stiffness: 200,
        mass: 0.6,
    },

    // Scale for press states
    pressScale: 0.98,
    pressOpacity: 0.9,
} as const;

// ============================================================================
// LAYOUT
// ============================================================================
export const layout = {
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    contentPadding: spacing.lg,
    cardPadding: spacing.lg,

    // Safe area defaults (will be overridden by useSafeAreaInsets)
    safeAreaTop: Platform.OS === 'ios' ? 47 : 24,
    safeAreaBottom: Platform.OS === 'ios' ? 34 : 0,

    // Tab bar
    tabBarHeight: 49,

    // Button heights
    buttonHeight: 52,
    buttonHeightSmall: 40,
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if iOS 26+ liquid glass is available
 * This should be used in .ios.tsx files to conditionally enable liquid glass
 */
export const isLiquidGlassAvailable = (): boolean => {
    if (Platform.OS !== 'ios') return false;

    // Parse iOS version
    const version = Platform.Version;
    if (typeof version === 'string') {
        const majorVersion = parseInt(version.split('.')[0], 10);
        return majorVersion >= 26;
    }
    return version >= 26;
};

/**
 * Get gradient colors for Skia backgrounds
 */
export const gradients = {
    background: [colors.bgGradientTop, colors.bgGradientBottom],
    accent: [colors.accent, colors.accentMuted],
    glass: ['rgba(80, 47, 76, 0.1)', 'rgba(80, 47, 76, 0.2)'],
} as const;

// ============================================================================
// THEME EXPORT
// ============================================================================
export const theme = {
    palette,
    colors,
    typography,
    spacing,
    radius,
    shadows,
    animation,
    layout,
    gradients,
    isLiquidGlassAvailable,
} as const;

export type Theme = typeof theme;
export default theme;
