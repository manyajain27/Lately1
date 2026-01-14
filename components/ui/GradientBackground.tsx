/**
 * GradientBackground Component
 * Full-screen gradient background using Skia
 * Linear gradient with radial glow at center top
 */

import { Canvas, Circle, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { palette } from '../../constants/theme';

interface GradientBackgroundProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function GradientBackground({
    children,
    style,
}: GradientBackgroundProps) {
    const { width, height } = useWindowDimensions();

    return (
        <View style={[styles.container, style]}>
            <Canvas style={StyleSheet.absoluteFill}>
                {/* Deep Black Background */}
                <Rect x={0} y={0} width={width} height={height} color="#000000" />

                {/* Top Left - Cyan/Teal Glow (Opal Primary) */}
                <Circle cx={0} cy={0} r={width * 0.8}>
                    <RadialGradient
                        c={vec(0, 0)}
                        r={width * 0.8}
                        colors={['rgba(79, 240, 183, 0.15)', 'transparent']}
                    />
                </Circle>

                {/* Top Right - Purple/Magenta Glow */}
                <Circle cx={width} cy={height * 0.2} r={width * 0.9}>
                    <RadialGradient
                        c={vec(width, height * 0.2)}
                        r={width * 0.9}
                        colors={['rgba(123, 97, 255, 0.12)', 'transparent']}
                    />
                </Circle>

                {/* Bottom Center - Warm/Orange Glow */}
                <Circle cx={width * 0.3} cy={height} r={width}>
                    <RadialGradient
                        c={vec(width * 0.3, height)}
                        r={width}
                        colors={['rgba(255, 159, 67, 0.08)', 'transparent']}
                    />
                </Circle>
            </Canvas>
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.black,
    },
    content: {
        flex: 1,
    },
});

export default GradientBackground;
