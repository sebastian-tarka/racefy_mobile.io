/**
 * Pre-run GPS health warnings. Renders nothing when everything is OK;
 * otherwise lists the failing checks as tappable rows that deep-link to the
 * right fix (permission request, battery exemption dialog, OEM battery
 * manager, system settings).
 */

import React, { useCallback } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useTheme } from '../hooks/useTheme';
import type { GpsHealthState } from '../hooks/useGpsHealthCheck';
import {
  getOemKey,
  openOemBatterySettings,
  requestIgnoreBatteryOptimizations,
} from '../services/batteryOptimization';
import { borderRadius, fontSize, spacing } from '../theme';

interface Props {
  health: GpsHealthState;
  onRefresh: () => void;
}

interface Row {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  severity: 'blocked' | 'warn';
  onPress: () => void;
}

export function GpsHealthCheckCard({ health, onRefresh }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const fixBattery = useCallback(async () => {
    await requestIgnoreBatteryOptimizations();

    // Aggressive OEMs need an extra vendor-specific tweak — guide the user
    const oem = getOemKey();
    if (oem) {
      Alert.alert(t('recording.gpsHealth.oemTitle'), t(`recording.gpsHealth.oem.${oem}`), [
        { text: t('common.cancel'), style: 'cancel', onPress: onRefresh },
        {
          text: t('recording.gpsHealth.openOemSettings'),
          onPress: async () => {
            const opened = await openOemBatterySettings(oem);
            if (!opened) openSettings();
            onRefresh();
          },
        },
      ]);
    } else {
      onRefresh();
    }
  }, [t, onRefresh, openSettings]);

  const rows: Row[] = [];

  if (!health.locationGranted) {
    rows.push({
      key: 'location',
      icon: 'location-outline',
      severity: 'blocked',
      onPress: async () => {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' && !canAskAgain) openSettings();
        onRefresh();
      },
    });
  }
  if (!health.locationServicesOn) {
    rows.push({
      key: 'services',
      icon: 'navigate-outline',
      severity: 'blocked',
      onPress: openSettings,
    });
  }
  if (health.locationGranted && !health.preciseLocation) {
    rows.push({ key: 'precise', icon: 'locate-outline', severity: 'warn', onPress: openSettings });
  }
  if (!health.batteryUnrestricted) {
    rows.push({
      key: 'battery',
      icon: 'battery-half-outline',
      severity: 'warn',
      onPress: fixBattery,
    });
  }
  if (!health.notificationsGranted) {
    rows.push({
      key: 'notifications',
      icon: 'notifications-off-outline',
      severity: 'warn',
      onPress: openSettings,
    });
  }
  if (health.powerSaveModeOn) {
    rows.push({
      key: 'powerSave',
      icon: 'flash-off-outline',
      severity: 'warn',
      onPress: openSettings,
    });
  }

  if (rows.length === 0 || health.isChecking) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      accessibilityLabel={t('recording.gpsHealth.title')}
    >
      <View style={styles.header}>
        <Ionicons
          name={health.overall === 'blocked' ? 'warning' : 'alert-circle-outline'}
          size={18}
          color={health.overall === 'blocked' ? colors.error : colors.warning}
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('recording.gpsHealth.title')}
        </Text>
      </View>

      {rows.map((row) => (
        <TouchableOpacity
          key={row.key}
          style={styles.row}
          onPress={row.onPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={row.icon}
            size={18}
            color={row.severity === 'blocked' ? colors.error : colors.warning}
          />
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
              {t(`recording.gpsHealth.${row.key}.title`)}
            </Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              {t(`recording.gpsHealth.${row.key}.description`)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  rowDescription: {
    fontSize: fontSize.xs,
  },
});
