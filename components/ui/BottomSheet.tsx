/**
 * Bottom Sheet Modal Component
 * Minimal, premium bottom sheet for displaying content
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';
import { Text } from './Text';

interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
                    <Pressable style={styles.backdrop} onPress={onClose} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    entering={SlideInDown.duration(300).springify()}
                    style={styles.sheetContainer}
                >
                    <GlassView style={[styles.sheet, { paddingBottom: insets.bottom || spacing.xl }]} glassEffectStyle="clear">
                        {/* Handle */}
                        <View style={styles.handleContainer}>
                            <View style={styles.handle} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <Text variant="titleM" style={styles.title}>
                                {title}
                            </Text>
                            <Pressable onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.content}
                            contentContainerStyle={styles.contentContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            {children}
                        </ScrollView>
                    </GlassView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheetContainer: {
        height: '90%',
    },
    sheet: {
        flex: 1,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surface2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    title: {
        flex: 1,
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.md,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['3xl'],
    },
});
