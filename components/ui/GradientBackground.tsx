/**
 * GradientBackground Component
 * Premium dark gradient with accent glow from top center
 */

import { Canvas, Circle, LinearGradient, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
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
                {/* Premium vertical gradient: dark top → subtle color bottom */}
                <Rect x={0} y={0} width={width} height={height}>
                    <LinearGradient
                        start={vec(0, 0)}
                        end={vec(0, height)}
                        colors={[
                            '#0A0A0C',           // Deep black (top)
                            '#0D0D10',           // Slightly lighter
                            '#0F0F14',           // Dark gray
                            '#101018',           // Hint of blue
                            '#0E1015',           // Dark base (bottom)
                        ]}
                        positions={[0, 0.3, 0.5, 0.75, 1]}
                    />
                </Rect>

                {/* Radial glow from top center - accent color */}
                <Circle cx={width / 2} cy={-50} r={width * 0.9}>
                    <RadialGradient
                        c={vec(width / 2, -50)}
                        r={width * 0.9}
                        colors={[
                            'rgba(79, 240, 183, 0.15)',  // Accent green glow
                            'rgba(79, 240, 183, 0.05)',
                            'transparent',
                        ]}
                        positions={[0, 0.4, 1]}
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
