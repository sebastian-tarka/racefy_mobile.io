import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { fontSize, spacing } from '../../../theme';
import type { Activity, GpsTrack } from '../../../types/api';
import { formatDate } from '../../../utils/dateFormat';

/** Date, source and GPS point count. */
export function ActivityTechnicalInfo({
  activity,
  gpsTrack,
}: {
  activity: Activity;
  gpsTrack: GpsTrack | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('activityDetail.technicalInfo')}
      </Text>
      <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
          {t('activityDetail.date')}
        </Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
          {formatDate(activity.started_at, 'PPpp')}
        </Text>
      </View>
      <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
        <Ionicons name="phone-portrait-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
          {t('activityDetail.source')}
        </Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
          {activity.source === 'app'
            ? t('activityDetail.sources.app')
            : activity.source === 'manual'
              ? t('activityDetail.sources.manual')
              : activity.source === 'gpx_import'
                ? t('activityDetail.sources.gpxImport')
                : activity.source}
        </Text>
      </View>
      {gpsTrack && (
        <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
          <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {t('activityDetail.gpsPoints')}
          </Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
            {gpsTrack.points_count.toLocaleString()} {t('activityDetail.points')}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  infoLabel: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
