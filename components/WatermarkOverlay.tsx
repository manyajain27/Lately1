/**
 * Watermark Overlay Component
 * Displays "lately" watermark on photos
 */

import React from 'react';
import { Text as RNText, StyleSheet, View } from 'react-native';

interface WatermarkOverlayProps {
    width: number;
    height: number;
    visible?: boolean;
}

/**
 * Watermark overlay for preview
 * Shows the "lately" text in bottom-right corner
 * Uses native Text for simplicity and reliability
 */
export function WatermarkOverlay({ width, height, visible = true }: WatermarkOverlayProps) {
    if (!visible) return null;

    // Dynamic font size based on image width
    const fontSize = Math.max(14, Math.min(24, width * 0.04));

    return (
        <View style={[styles.container, { width, height }]} pointerEvents="none">
            <View style={styles.watermarkContainer}>
                <View style={styles.shadowText}>
                    <RNText style={[styles.text, { fontSize, textShadowColor: 'transparent' }]}>
                        lately
                    </RNText>
                </View>
                <RNText style={[styles.text, { fontSize }]}>
                    lately
                </RNText>
            </View>
        </View>
    );
}

/**
 * Simple watermark badge for thumbnails
 */
export function WatermarkBadge({ visible = true }: { visible?: boolean }) {
    if (!visible) return null;

    return (
        <View style={styles.badge}>
            <RNText style={styles.badgeText}>lately</RNText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    watermarkContainer: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    shadowText: {
        position: 'absolute',
        top: 1,
        left: 1,
    },
    text: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    badge: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});

export default WatermarkOverlay;
