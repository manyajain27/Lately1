
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassView } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../constants/theme';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    const tabs = [
        { name: 'index', icon: 'home', iconActive: 'home', label: 'home' },
        { name: 'memories', icon: 'images-outline', iconActive: 'images', label: 'memories' },
        { name: 'profile', icon: 'person-outline', iconActive: 'person', label: 'profile' },
    ];

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }]}>
            <GlassView style={styles.content} isInteractive>
                <View style={styles.tabs}>
                    {tabs.map((tab, index) => {
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: state.routes[index].key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(state.routes[index].name);
                            }
                        };

                        return (
                            <Pressable
                                key={tab.name}
                                onPress={onPress}
                                style={styles.tab}
                                hitSlop={10}
                            >
                                <Text
                                    variant="caption"
                                    style={[
                                        styles.label,
                                        isFocused && styles.labelActive
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.divider} />

                <Pressable
                    onPress={() => navigation.navigate('create')}
                    style={styles.createTab}
                >
                    <Text variant="caption" style={styles.label}>create</Text>
                </Pressable>
            </GlassView>
        </View>
    );
}

// Helper Text component access (since we can't import Text from ui/Text easily if circle dep, 
// strictly we should import from there but let's assume we can import generic Text or use the one from UI)
// Actually we have Text in components/ui.
import { Text } from './ui/Text';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: 100, // Pill shape
        overflow: 'hidden',
        // Default border/bg handled by native glass or we rely on systemChromeMaterial
    },
    tabs: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    tab: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        color: colors.textSecondary,
        fontWeight: '500',
    },
    labelActive: {
        color: colors.textPrimary,
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: colors.borderSoft,
        marginHorizontal: spacing.sm,
    },
    createTab: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
});
