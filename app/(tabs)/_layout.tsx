/**
 * Tabs Layout
 * Seamless tab bar + glass create button
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;
const GRADIENT_HEIGHT = 150;

interface TabConfig {
    name: string;
    icon: string;
    iconFilled: string;
}

const TABS: TabConfig[] = [
    { name: 'index', icon: 'home-outline', iconFilled: 'home' },
    { name: 'memories', icon: 'images-outline', iconFilled: 'images' },
    { name: 'profile', icon: 'person-outline', iconFilled: 'person' },
];

function CustomTabBar({ state, navigation }: any) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const totalHeight = TAB_BAR_HEIGHT + insets.bottom;

    const handleCreatePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/create');
    };

    return (
        <View style={[styles.tabBarContainer, { height: totalHeight + 60 }]} pointerEvents="box-none">
            {/* Darker gradient fade */}
            <Canvas style={styles.gradientCanvas} pointerEvents="none">
                <Rect x={0} y={0} width={SCREEN_WIDTH} height={GRADIENT_HEIGHT + totalHeight}>
                    <LinearGradient
                        start={vec(0, 0)}
                        end={vec(0, GRADIENT_HEIGHT + totalHeight)}
                        colors={[
                            'transparent',
                            'rgba(10, 10, 12, 0.6)',
                            'rgba(10, 10, 12, 0.9)',
                            '#0A0A0C',
                            '#0A0A0C',
                        ]}
                        positions={[0, 0.15, 0.4, 0.6, 1]}
                    />
                </Rect>
            </Canvas>

            {/* Glass create button (just above tab bar) */}
            <View style={[styles.createButtonContainer, { bottom: totalHeight + 8 }]}>
                <Pressable onPress={handleCreatePress}>
                    <View style={styles.glowWrapper}>
                        <GlassView style={styles.createButton} glassEffectStyle="regular">
                            <Text style={styles.createText}>create</Text>
                        </GlassView>
                    </View>
                </Pressable>
            </View>

            {/* Tab icons */}
            <View style={[styles.tabBarInner, { paddingBottom: insets.bottom }]}>
                {state.routes.map((route: any, index: number) => {
                    const tab = TABS.find(t => t.name === route.name);
                    if (!tab) return null;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (!isFocused) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                        >
                            <Ionicons
                                name={isFocused ? tab.iconFilled : tab.icon as any}
                                size={26}
                                color={isFocused ? 'white' : 'rgba(255,255,255,0.35)'}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="memories" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen
                name="create"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    gradientCanvas: {
        ...StyleSheet.absoluteFillObject,
    },
    tabBarInner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingTop: 16,
        paddingBottom: 14,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createButtonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    glowWrapper: {
        shadowColor: '#4FF0B7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    createButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        overflow: 'hidden',
    },
    createText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
