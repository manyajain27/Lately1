/**
 * SkiaGradient Component
 * 
 * A replacement for expo-linear-gradient using standard Skia.
 * Useful for simple overlay gradients (e.g. text protection).
 */
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface SkiaGradientProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: ViewStyle;
}

export function SkiaGradient({
    colors,
    start = { x: 0, y: 0 },
    end = { x: 0, y: 1 },
    style,
}: SkiaGradientProps) {
    // We render a canvas that fills the container
    return (
        <View style={[styles.container, style]}>
            <Canvas style={StyleSheet.absoluteFill}>
                <Rect x={0} y={0} width={1000} height={1000}>
                    <LinearGradient
                        start={vec(start.x * 1000, start.y * 1000)} // Approximate relative coords by scaling
                        end={vec(end.x * 1000, end.y * 1000)}
                        colors={colors}
                    />
                </Rect>
            </Canvas>
        </View>
    );
}

// Better version that uses onLayout to get exact dimensions
export function SkiaOverlay({ colors, style }: { colors: string[], style?: any }) {
    const [layout, setLayout] = React.useState({ width: 0, height: 0 });

    return (
        <View
            style={[style, { overflow: 'hidden' }]}
            onLayout={(e) => setLayout(e.nativeEvent.layout)}
        >
            {layout.width > 0 && (
                <Canvas style={StyleSheet.absoluteFill}>
                    <Rect x={0} y={0} width={layout.width} height={layout.height}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(0, layout.height)}
                            colors={colors}
                        />
                    </Rect>
                </Canvas>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
});
