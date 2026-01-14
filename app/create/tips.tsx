import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { GradientBackground, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';

export default function TipsScreen() {
    const router = useRouter();

    return (
        <GradientBackground>
            <View style={styles.container}>
                <GlassView style={styles.content} isInteractive>
                    <View style={styles.header}>
                        <Text variant="titleM">tips for the best dumps</Text>
                        <Pressable onPress={() => router.back()}>
                            <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
                        </Pressable>
                    </View>
                    <View style={styles.tipsList}>
                        <View style={styles.tipItem}>
                            <Text variant="bodyL">🌅</Text>
                            <Text variant="bodyS" color="secondary">include a sunset or golden hour shot</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Text variant="bodyL">📸</Text>
                            <Text variant="bodyS" color="secondary">mix candids with posed photos</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Text variant="bodyL">🐾</Text>
                            <Text variant="bodyS" color="secondary">pets always level up the dump</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Text variant="bodyL">🍕</Text>
                            <Text variant="bodyS" color="secondary">add a food or drink detail shot</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Text variant="bodyL">📱</Text>
                            <Text variant="bodyS" color="secondary">one meme/screenshot adds personality</Text>
                        </View>
                    </View>
                </GlassView>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    content: {
        width: '100%',
        padding: spacing.xl,
        borderRadius: radius.xl,
        backgroundColor: colors.surface1,
        borderWidth: 0.5,
        borderColor: colors.borderSoft,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    tipsList: {
        gap: spacing.lg,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
});
