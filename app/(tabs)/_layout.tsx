/**
 * Tabs Layout
 * Native tabs with iOS 26 liquid glass effect
 * Themed with app colors
 */

import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { colors } from '../../constants/theme';

export default function TabsLayout() {
    return (
        <NativeTabs
            tintColor={colors.accent}
        >
            <NativeTabs.Trigger name="index">
                <Icon sf={{ default: 'house', selected: 'house.fill' }} />
                <Label>home</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="memories">
                <Icon sf={{ default: 'photo.stack', selected: 'photo.stack.fill' }} />
                <Label>memories</Label>
         
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                <Icon sf={{ default: 'person', selected: 'person.fill' }} />
                <Label>profile</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="create" role="search">
                <Icon sf={{ default: 'plus', selected: 'plus' }} />
                <Label>create</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
