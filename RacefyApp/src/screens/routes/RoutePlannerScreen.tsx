import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  ScreenHeader,
  ScreenContainer,
  SportTypeSelector,
} from '../../components';
import { MapboxRoutePlanner } from '../../components/MapboxRoutePlanner';
import { useRoutePlanner } from '../../hooks/useRoutePlanner';
import { useTheme } from '../../hooks/useTheme';
import { formatDistance, formatTotalTime } from '../../utils/formatters';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutePlanner'>;

export function RoutePlannerScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const {
    waypoints,
    profile,
    preview,
    isLoadingPreview,
    isSaving,
    error,
    addWaypoint,
    removeWaypoint,
    undo,
    clearAll,
    changeProfile,
    saveRoute,
  } = useRoutePlanner();

  // Save form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportTypeId, setSportTypeId] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleMapTap = useCallback((lat: number, lng: number) => {
    addWaypoint(lat, lng);
  }, [addWaypoint]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('common.fieldRequired'));
      return;
    }
    if (!sportTypeId) {
      Alert.alert(t('common.error'), t('common.fieldRequired'));
      return;
    }

    const route = await saveRoute(title.trim(), sportTypeId, description.trim() || undefined, isPublic);
    if (route) {
      navigation.replace('RouteDetail', { routeId: route.id });
    }
  }, [title, sportTypeId, description, isPublic, saveRoute, navigation, t]);

  const hasRoute = waypoints.length >= 2 && preview.geometry;

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('routes.createRoute')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerActions}>
            {waypoints.length > 0 && (
              <TouchableOpacity onPress={undo} style={styles.headerButton}>
                <Ionicons name="arrow-undo-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            {waypoints.length > 0 && (
              <TouchableOpacity onPress={clearAll} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {!showSaveForm ? (
        <>
          {/* Profile toggle */}
          <View style={styles.profileToggle}>
            <TouchableOpacity
              style={[
                styles.profileOption,
                profile === 'walking' && { backgroundColor: colors.primary },
              ]}
              onPress={() => changeProfile('walking')}
            >
              <Ionicons
                name="walk-outline"
                size={18}
                color={profile === 'walking' ? '#fff' : colors.textSecondary}
              />
              <Text style={[
                styles.profileText,
                { color: profile === 'walking' ? '#fff' : colors.textSecondary },
              ]}>
                {t('routes.walking')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.profileOption,
                profile === 'cycling' && { backgroundColor: colors.primary },
              ]}
              onPress={() => changeProfile('cycling')}
            >
              <Ionicons
                name="bicycle-outline"
                size={18}
                color={profile === 'cycling' ? '#fff' : colors.textSecondary}
              />
              <Text style={[
                styles.profileText,
                { color: profile === 'cycling' ? '#fff' : colors.textSecondary },
              ]}>
                {t('routes.cycling')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Map */}
          <MapboxRoutePlanner
            waypoints={waypoints}
            routeGeometry={preview.geometry}
            isLoadingPreview={isLoadingPreview}
            onMapTap={handleMapTap}
            height={350}
          />

          {/* Hint */}
          {waypoints.length === 0 && (
            <View style={styles.hint}>
              <Ionicons name="finger-print-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {t('routes.tapToAddWaypoint', 'Tap on the map to add waypoints')}
              </Text>
            </View>
          )}

          {/* Waypoints list */}
          {waypoints.length > 0 && (
            <View style={styles.waypointsList}>
              {waypoints.map((wp, idx) => (
                <View key={idx} style={[styles.waypointRow, { borderBottomColor: colors.border }]}>
                  <View style={[
                    styles.waypointDot,
                    {
                      backgroundColor: idx === 0 ? '#22c55e' :
                        idx === waypoints.length - 1 ? '#ef4444' : '#3b82f6',
                    },
                  ]} />
                  <Text style={[styles.waypointLabel, { color: colors.textPrimary }]}>
                    {wp.label || `${t('routeDetail.waypoints', 'Waypoint')} ${idx + 1}`}
                  </Text>
                  <TouchableOpacity onPress={() => removeWaypoint(idx)}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Route stats */}
          {hasRoute && (
            <View style={[styles.statsBar, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {formatDistance(preview.distance)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('routeDetail.distance')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  ~{formatTotalTime(preview.estimatedDuration)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('routeDetail.estimatedTime')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {preview.elevationGain}m
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('routeDetail.elevation')}
                </Text>
              </View>
            </View>
          )}

          {/* Save button */}
          {hasRoute && (
            <View style={styles.bottomAction}>
              <Button
                title={t('common.next', 'Next')}
                onPress={() => setShowSaveForm(true)}
              />
            </View>
          )}
        </>
      ) : (
        /* Save form */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.saveForm}
        >
          <ScrollView contentContainerStyle={styles.saveFormContent}>
            <Input
              label={t('common.title', 'Title')}
              value={title}
              onChangeText={setTitle}
              placeholder={t('routes.routeTitlePlaceholder', 'My morning run route')}
            />

            <Input
              label={t('common.description', 'Description')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('routes.routeDescriptionPlaceholder', 'Optional description...')}
              multiline
              numberOfLines={3}
            />

            <SportTypeSelector
              value={sportTypeId}
              onChange={setSportTypeId}
            />

            <TouchableOpacity
              style={styles.publicToggle}
              onPress={() => setIsPublic(!isPublic)}
            >
              <Ionicons
                name={isPublic ? 'checkbox' : 'square-outline'}
                size={22}
                color={isPublic ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.publicLabel, { color: colors.textPrimary }]}>
                {t('routes.makePublic', 'Make this route public')}
              </Text>
            </TouchableOpacity>

            {/* Route summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                {formatDistance(preview.distance)} · ~{formatTotalTime(preview.estimatedDuration)} · {waypoints.length} {t('routeDetail.waypoints').toLowerCase()}
              </Text>
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}

            <View style={styles.saveActions}>
              <Button
                title={t('common.back', 'Back')}
                onPress={() => setShowSaveForm(false)}
                variant="outline"
              />
              <Button
                title={t('common.save', 'Save')}
                onPress={handleSave}
                loading={isSaving}
                disabled={!title.trim() || !sportTypeId}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  profileToggle: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  profileText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  hintText: {
    fontSize: fontSize.sm,
  },
  waypointsList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  waypointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  waypointLabel: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  bottomAction: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  saveForm: {
    flex: 1,
  },
  saveFormContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  publicToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  publicLabel: {
    fontSize: fontSize.sm,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: fontSize.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  saveActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
