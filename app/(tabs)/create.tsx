/**
 * Create Tab Redirect
 * This tab opens the create modal and resets selection
 */

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { colors } from '../../constants/theme';

export default function CreateTab() {
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            // Push the create modal
            router.push('/create');

            // Immediately navigate back to index tab in the background
            // This ensures when the modal closes, we are on the Home tab, avoids loop
            router.replace('/(tabs)');
        }, [])
    );

    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
}
