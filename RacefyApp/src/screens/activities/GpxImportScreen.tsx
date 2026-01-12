import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenHeader, Button, Card, EventSelectionSheet } from '../../components';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useTheme } from '../../hooks/useTheme';
import { useOngoingEvents } from '../../hooks/useOngoingEvents';
import { useSportTypes, type SportTypeWithIcon } from '../../hooks/useSportTypes';
import type { Event } from '../../types/api';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GpxImport'>;

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export function GpxImportScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sportTypes, isLoading: sportsLoading } = useSportTypes();

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [selectedSport, setSelectedSport] = useState<SportTypeWithIcon | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventSheetVisible, setEventSheetVisible] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch ongoing events where user is registered
  const { events: ongoingEvents, isLoading: eventsLoading, refresh: refreshEvents } = useOngoingEvents();

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/gpx+xml', 'text/xml', 'application/xml', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Validate file extension
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.gpx')) {
          Alert.alert(
            t('common.error'),
            t('gpxImport.invalidFileType')
          );
          return;
        }

        setSelectedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/gpx+xml',
          size: file.size,
        });
      }
    } catch (error) {
      logger.error('general', 'Document picker error', { error });
      Alert.alert(t('common.error'), t('gpxImport.selectFileFailed'));
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedSport) return;

    setIsImporting(true);
    try {
      const formData = new FormData();

      formData.append('file', {
        uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
        type: selectedFile.type,
        name: selectedFile.name,
      } as any);

      formData.append('sport_type_id', String(selectedSport.id));

      // Add event_id if an event is selected
      if (selectedEvent) {
        formData.append('event_id', String(selectedEvent.id));
      }

      const activity = await api.importGpx(formData);

      Alert.alert(
        t('common.success'),
        t('gpxImport.importSuccess'),
        [
          {
            text: t('gpxImport.viewActivity'),
            onPress: () => {
              navigation.replace('ActivityDetail', { activityId: activity.id });
            },
          },
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      logger.error('activity', 'GPX import failed', { error });
      Alert.alert(
        t('common.error'),
        error.message || t('gpxImport.importFailed')
      );
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canImport = selectedFile && selectedSport && !isImporting;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('gpxImport.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
              {t('gpxImport.supportedDevices')}
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('gpxImport.supportedDevicesDesc')}
          </Text>
        </Card>

        {/* File Selection */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('gpxImport.selectFile')}
          </Text>

          <TouchableOpacity
            style={[
              styles.fileSelector,
              { backgroundColor: colors.background, borderColor: colors.border },
              selectedFile && { borderColor: colors.primary, borderStyle: 'solid' },
            ]}
            onPress={handleSelectFile}
            activeOpacity={0.7}
          >
            {selectedFile ? (
              <View style={styles.selectedFileContent}>
                <View style={[styles.fileIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="document-text" size={28} color={colors.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  {selectedFile.size && (
                    <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                      {formatFileSize(selectedFile.size)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedFile(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyFileContent}>
                <View style={[styles.uploadIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.selectFileText, { color: colors.textPrimary }]}>
                  {t('gpxImport.tapToSelect')}
                </Text>
                <Text style={[styles.selectFileHint, { color: colors.textSecondary }]}>
                  {t('gpxImport.gpxFilesOnly')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Card>

        {/* Sport Type Selection */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('gpxImport.selectSportType')}
          </Text>

          {sportsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.sportGrid}>
              {sportTypes.map((sport) => {
                const isSelected = selectedSport?.id === sport.id;
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.sportButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isSelected && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedSport(sport)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={sport.icon}
                      size={24}
                      color={isSelected ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.sportLabel,
                        { color: colors.textPrimary },
                        isSelected && { color: colors.white },
                      ]}
                      numberOfLines={1}
                    >
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* Event Selection (Optional) */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('gpxImport.linkToEvent')}
          </Text>

          <TouchableOpacity
            style={[
              styles.eventSelector,
              { backgroundColor: colors.background, borderColor: colors.border },
              selectedEvent && { borderColor: colors.primary },
            ]}
            onPress={() => {
              refreshEvents();
              setEventSheetVisible(true);
            }}
            activeOpacity={0.7}
          >
            {selectedEvent ? (
              <>
                <View style={[styles.eventIconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons
                    name={selectedEvent.sport_type?.icon as any || 'calendar-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.eventSelectorContent}>
                  <Text style={[styles.eventSelectorTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedEvent.post?.title || t('eventDetail.untitled')}
                  </Text>
                  <Text style={[styles.eventSelectorSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedEvent.location_name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedEvent(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.eventIconContainer, { backgroundColor: colors.textMuted + '20' }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                </View>
                <Text style={[styles.eventSelectorPlaceholder, { color: colors.textSecondary }]}>
                  {t('gpxImport.selectEvent')}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Import Button */}
        <Button
          title={isImporting ? t('gpxImport.importing') : t('gpxImport.importButton')}
          onPress={handleImport}
          disabled={!canImport}
          loading={isImporting}
          style={styles.importButton}
        />
      </ScrollView>

      {/* Event Selection Sheet */}
      <EventSelectionSheet
        visible={eventSheetVisible}
        onClose={() => setEventSheetVisible(false)}
        onSelect={setSelectedEvent}
        events={ongoingEvents}
        selectedEvent={selectedEvent}
        isLoading={eventsLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  infoText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  fileSelector: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyFileContent: {
    alignItems: 'center',
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectFileText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  selectFileHint: {
    fontSize: fontSize.sm,
  },
  selectedFileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportButton: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  sportLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  eventSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  eventIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventSelectorContent: {
    flex: 1,
  },
  eventSelectorTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  eventSelectorSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  eventSelectorPlaceholder: {
    flex: 1,
    fontSize: fontSize.md,
  },
  importButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
