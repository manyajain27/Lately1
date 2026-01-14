/**
 * Create Flow Layout
 */

import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function CreateLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="select" />
            <Stack.Screen name="preview" />
            <Stack.Screen name="export" />
        </Stack>
    );
}
