
import { GlassView } from 'expo-glass-effect';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { Text } from './ui/Text';

interface DumpCardProps {
    title: string;
    subtitle: string;
    isNew?: boolean;
    onPress?: () => void;
}

export function DumpCard({ title, subtitle, isNew, onPress }: DumpCardProps) {
    const [pressed, setPressed] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={[
                styles.container,
                pressed && styles.pressed
            ]}
        >
            <GlassView
                style={styles.card}
                isInteractive
            >
                <View style={styles.grid}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.gridItem}>
                            <View style={styles.imagePlaceholder} />
                        </View>
                    ))}
                </View>
                <View style={styles.info}>
                    <View>
                        <Text variant="bodyM" style={styles.title}>{title}</Text>
                        <Text variant="caption" style={styles.subtitle}>{subtitle}</Text>
                    </View>
                    {isNew && (
                        <View style={styles.badge}>
                            <Text variant="caption" style={styles.badgeText}>new</Text>
                        </View>
                    )}
                </View>
            </GlassView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    card: {
        padding: 16,
        borderRadius: 18, // User requested this specific radius
        backgroundColor: colors.surface1, // Matches user snippet visual
        borderWidth: 0.5,
        borderColor: colors.borderSoft,
        overflow: 'hidden',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
        gap: 4,
    },
    gridItem: {
        width: '24%', // Close to 25% but leave room for gap
        aspectRatio: 1,
    },
    imagePlaceholder: {
        flex: 1,
        backgroundColor: colors.bgElevated,
        borderRadius: 8,
    },
    info: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    subtitle: {
        color: colors.textSecondary,
        marginTop: 2,
    },
    badge: {
        backgroundColor: colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        color: colors.bg,
        fontWeight: '600',
        fontSize: 12,
    },
});
