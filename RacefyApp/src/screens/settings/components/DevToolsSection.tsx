import React from 'react';
import { Alert, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import * as BackgroundTask from 'expo-background-task';
import { Button } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { ensureFinishSyncTaskRegistered } from '../../../services/finishSyncBackgroundTask';
import { countPendingFinishes } from '../../../services/trackingDb';
import { fontSize, spacing } from '../../../theme';
import { getErrorMessage } from '../../../utils/errors';

/** Debug-build tools: background finish sync on demand and notification tests. */
export function DevToolsSection() {
  const { colors } = useTheme();

  return (
    <View style={{ padding: spacing.md }}>
      {/* The OS decides when the offline-finish task really runs (≥15 min,
          network + battery). This fires it on demand — debug builds only. */}
      <Button
        title={`Run background finish sync (${countPendingFinishes()} queued)`}
        variant="outline"
        onPress={async () => {
          try {
            await ensureFinishSyncTaskRegistered();
            const ran = await BackgroundTask.triggerTaskWorkerForTestingAsync();
            Alert.alert(
              'Background finish sync',
              ran
                ? 'Worker triggered. Put the app in the background to let it run.'
                : 'Not triggered — nothing registered (empty queue?) or not a debug build.',
            );
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
          }
        }}
      />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Send test notification (5s delay)"
        onPress={async () => {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Test Notification',
                body:
                  'Tap this to test if the app opens! Sent at ' + new Date().toLocaleTimeString(),
                data: { type: 'test', post_id: 1 },
                sound: 'default',
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 5,
              },
            });
            Alert.alert(
              'Scheduled',
              'Notification will appear in 5 seconds. Close the app and wait for it, then tap it.',
            );
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
          }
        }}
      />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Send immediate notification"
        onPress={async () => {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Immediate Test',
                body: 'Tap to test app opening. ' + new Date().toLocaleTimeString(),
                data: { type: 'test' },
                sound: 'default',
              },
              trigger: null,
            });
          } catch (e) {
            Alert.alert('Error', getErrorMessage(e));
          }
        }}
      />
      <View style={{ height: spacing.sm }} />
      <Button
        title="Show Push Token"
        onPress={async () => {
          try {
            const token = await Notifications.getExpoPushTokenAsync({
              projectId: '6eab0c85-bf5b-4308-96e2-15fcd9c780fe',
            });
            Alert.alert('Expo Push Token', token.data, [
              {
                text: 'Copy',
                onPress: () => {
                  Clipboard.setStringAsync(token.data);
                },
              },
              { text: 'OK' },
            ]);
          } catch (e) {
            Alert.alert('Error getting token', getErrorMessage(e));
          }
        }}
      />
      <View style={{ height: spacing.md }} />
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
        Test 1 - Lokalna notyfikacja:{'\n'}
        1. {'"Send test notification (5s delay)"'}
        {'\n'}
        2. Zminimalizuj appkę{'\n'}
        3. Tapnij powiadomienie{'\n'}
        {'\n'}
        Test 2 - Push via Expo Tool:{'\n'}
        1. {'"Show Push Token"'} → skopiuj token{'\n'}
        2. Wejdź na expo.dev/notifications{'\n'}
        3. Wklej token i wyślij{'\n'}
        4. Tapnij powiadomienie
      </Text>
    </View>
  );
}
