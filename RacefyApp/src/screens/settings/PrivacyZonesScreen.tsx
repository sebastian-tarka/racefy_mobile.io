import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../hooks/useTheme';
import { useSubscription } from '../../hooks/useSubscription';
import { ScreenHeader, EmptyState, ScreenContainer } from '../../components';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { upgradePromptEmitter } from '../../services/upgradePromptEmitter';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { PrivacyZone, PrivacyZoneSuggestion, CreatePrivacyZoneRequest } from '../../types/api';

const ZONE_TYPE_ICONS: Record<string, string> = {
  home: 'home',
  work: 'briefcase',
  other: 'location',
};

const ZONE_TYPES: Array<CreatePrivacyZoneRequest['type']> = ['home', 'work', 'other'];

export function PrivacyZonesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { features, canUse } = useSubscription();

  const [zones, setZones] = useState<PrivacyZone[]>([]);
  const [suggestions, setSuggestions] = useState<PrivacyZoneSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Add/Edit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<CreatePrivacyZoneRequest['type']>('home');
  const [newZoneLocation, setNewZoneLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const zonesLimit = typeof features.privacy_zones === 'number' ? features.privacy_zones : 1;
  const canAddMore = zones.length < zonesLimit;

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    try {
      const [zonesData, suggestionsData] = await Promise.all([
        api.getPrivacyZones(),
        api.getPrivacyZoneSuggestions().catch(() => [] as PrivacyZoneSuggestion[]),
      ]);
      setZones(zonesData);
      // Filter suggestions that are not already zones
      const existingCoords = new Set(zonesData.map(z => `${z.latitude.toFixed(4)},${z.longitude.toFixed(4)}`));
      setSuggestions(suggestionsData.filter(s =>
        !existingCoords.has(`${s.latitude.toFixed(4)},${s.longitude.toFixed(4)}`)
      ));
    } catch (err) {
      logger.error('general', 'Failed to load privacy zones', { error: err });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  const handleToggle = async (zone: PrivacyZone) => {
    setTogglingId(zone.id);
    try {
      const updated = await api.togglePrivacyZone(zone.id);
      setZones(prev => prev.map(z => z.id === zone.id ? updated : z));
    } catch (err) {
      logger.error('general', 'Failed to toggle privacy zone', { error: err });
      Alert.alert(t('common.error'), t('common.genericError'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (zone: PrivacyZone) => {
    Alert.alert(
      t('settings.privacyZones.deleteZone'),
      t('settings.privacyZones.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingId(zone.id);
            try {
              await api.deletePrivacyZone(zone.id);
              setZones(prev => prev.filter(z => z.id !== zone.id));
            } catch (err) {
              logger.error('general', 'Failed to delete privacy zone', { error: err });
              Alert.alert(t('common.error'), t('common.genericError'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleAddPress = () => {
    if (!canAddMore) {
      upgradePromptEmitter.emit('show', { feature: 'privacy_zones' });
      return;
    }
    setNewZoneName('');
    setNewZoneType('home');
    setNewZoneLocation(null);
    setShowAddModal(true);
  };

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('recording.permissions.locationDenied'));
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNewZoneLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    } catch (err) {
      logger.error('general', 'Failed to get current location', { error: err });
      Alert.alert(t('common.error'), t('common.genericError'));
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert(t('common.error'), t('settings.privacyZones.zoneName'));
      return;
    }
    if (!newZoneLocation) {
      Alert.alert(t('common.error'), t('settings.privacyZones.tapMapToSelect'));
      return;
    }

    setAddLoading(true);
    try {
      const created = await api.createPrivacyZone({
        name: newZoneName.trim(),
        type: newZoneType,
        latitude: newZoneLocation.lat,
        longitude: newZoneLocation.lng,
      });
      setZones(prev => [...prev, created]);
      setShowAddModal(false);
      Alert.alert(t('common.success'), t('settings.privacyZones.saved'));
    } catch (err: any) {
      if (err?.status === 403) {
        upgradePromptEmitter.emit('show', { feature: 'privacy_zones' });
        setShowAddModal(false);
      } else {
        logger.error('general', 'Failed to create privacy zone', { error: err });
        Alert.alert(t('common.error'), t('common.genericError'));
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: PrivacyZoneSuggestion) => {
    if (!canAddMore) {
      upgradePromptEmitter.emit('show', { feature: 'privacy_zones' });
      return;
    }
    try {
      const created = await api.createPrivacyZone({
        name: suggestion.name,
        type: suggestion.type,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      });
      setZones(prev => [...prev, created]);
      setSuggestions(prev => prev.filter(s =>
        s.latitude !== suggestion.latitude || s.longitude !== suggestion.longitude
      ));
      Alert.alert(t('common.success'), t('settings.privacyZones.saved'));
    } catch (err: any) {
      if (err?.status === 403) {
        upgradePromptEmitter.emit('show', { feature: 'privacy_zones' });
      } else {
        logger.error('general', 'Failed to add suggested zone', { error: err });
        Alert.alert(t('common.error'), t('common.genericError'));
      }
    }
  };

  const renderZoneItem = ({ item: zone }: { item: PrivacyZone }) => (
    <View style={[styles.zoneCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.zoneRow}>
        <View style={[styles.zoneIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons
            name={(ZONE_TYPE_ICONS[zone.type] || 'location') as any}
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.zoneInfo}>
          <Text style={[styles.zoneName, { color: colors.textPrimary }]}>{zone.name}</Text>
          <Text style={[styles.zoneType, { color: colors.textMuted }]}>
            {t(`settings.privacyZones.type${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)}`)}
            {' \u2022 '}
            {zone.is_active ? t('settings.privacyZones.active') : t('settings.privacyZones.inactive')}
          </Text>
        </View>
        <View style={styles.zoneActions}>
          {togglingId === zone.id ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={zone.is_active}
              onValueChange={() => handleToggle(zone)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={zone.is_active ? colors.primary : colors.white}
            />
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.deleteButton, { borderTopColor: colors.border }]}
        onPress={() => handleDelete(zone)}
        disabled={deletingId === zone.id}
      >
        {deletingId === zone.id ? (
          <ActivityIndicator size="small" color={colors.error} />
        ) : (
          <>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>
              {t('settings.privacyZones.deleteZone')}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuggestion = (suggestion: PrivacyZoneSuggestion, index: number) => (
    <View
      key={`suggestion-${index}`}
      style={[styles.suggestionCard, { backgroundColor: colors.cardBackground, borderColor: colors.primary + '30' }]}
    >
      <View style={styles.suggestionRow}>
        <View style={[styles.zoneIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons
            name={(ZONE_TYPE_ICONS[suggestion.type] || 'location') as any}
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.zoneInfo}>
          <Text style={[styles.zoneName, { color: colors.textPrimary }]}>{suggestion.name}</Text>
          <Text style={[styles.zoneType, { color: colors.textMuted }]}>
            {t('settings.privacyZones.activities', { count: suggestion.activity_count })}
            {' \u2022 '}
            {t('settings.privacyZones.confidence', { value: suggestion.confidence })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addSuggestionButton, { backgroundColor: colors.primary }]}
          onPress={() => handleAcceptSuggestion(suggestion)}
        >
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addSuggestionText}>{t('settings.privacyZones.addSuggestion')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListHeader = () => (
    <>
      {/* Description */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t('settings.privacyZones.description')}
      </Text>

      {/* Limit indicator */}
      <View style={[styles.limitRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
        <Text style={[styles.limitText, { color: colors.textSecondary }]}>
          {zones.length} / {zonesLimit}
        </Text>
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('settings.privacyZones.suggestions')}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            {t('settings.privacyZones.suggestionsHint')}
          </Text>
          {suggestions.map((s, i) => renderSuggestion(s, i))}
        </View>
      )}

      {/* Zones section title */}
      {zones.length > 0 && (
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
          {t('settings.privacyZones.title')}
        </Text>
      )}
    </>
  );

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('settings.privacyZones.title')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('settings.privacyZones.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={zones}
        renderItem={renderZoneItem}
        keyExtractor={(item) => `zone-${item.id}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          !suggestions.length ? (
            <EmptyState
              icon="shield-outline"
              title={t('settings.privacyZones.title')}
              message={t('settings.privacyZones.empty')}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        {!canAddMore && <Ionicons name="lock-closed" size={14} color={colors.white} style={{ marginRight: 4 }} />}
        <Ionicons name="add" size={24} color={colors.white} />
      </TouchableOpacity>

      {/* Add Zone Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <ScreenContainer>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('settings.privacyZones.addZone')}
            </Text>
            <TouchableOpacity onPress={handleSaveZone} disabled={addLoading}>
              {addLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSaveText, { color: colors.primary }]}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            {/* Zone Name */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              {t('settings.privacyZones.zoneName')}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              value={newZoneName}
              onChangeText={setNewZoneName}
              placeholder={t('settings.privacyZones.zoneNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />

            {/* Zone Type */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              {t('settings.privacyZones.zoneType')}
            </Text>
            <View style={styles.typeRow}>
              {ZONE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, backgroundColor: colors.cardBackground },
                    newZoneType === type && { borderColor: colors.primary, backgroundColor: colors.primary },
                  ]}
                  onPress={() => setNewZoneType(type)}
                >
                  <Ionicons
                    name={(ZONE_TYPE_ICONS[type] || 'location') as any}
                    size={16}
                    color={newZoneType === type ? colors.white : colors.textSecondary}
                  />
                  <Text style={[
                    styles.typeChipText,
                    { color: colors.textSecondary },
                    newZoneType === type && { color: colors.white },
                  ]}>
                    {t(`settings.privacyZones.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              {t('settings.privacyZones.location')}
            </Text>

            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleUseCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="navigate" size={20} color={colors.primary} />
              )}
              <Text style={[styles.locationButtonText, { color: colors.primary }]}>
                {t('settings.privacyZones.useCurrentLocation')}
              </Text>
            </TouchableOpacity>

            {newZoneLocation && (
              <View style={[styles.locationPreview, { backgroundColor: colors.cardBackground, borderColor: colors.primary + '30' }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.locationPreviewText, { color: colors.textSecondary }]}>
                  {newZoneLocation.lat.toFixed(5)}, {newZoneLocation.lng.toFixed(5)}
                </Text>
              </View>
            )}

            <Text style={[styles.radiusHint, { color: colors.textMuted }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              {' '}{t('settings.privacyZones.radius')}
            </Text>
          </ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  limitText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  suggestionsSection: {
    marginBottom: spacing.md,
  },
  suggestionCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addSuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  addSuggestionText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  zoneCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  zoneType: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  zoneActions: {
    alignItems: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  deleteText: {
    fontSize: fontSize.sm,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  modalSaveText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  locationButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  locationPreviewText: {
    fontSize: fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  radiusHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.md,
  },
});