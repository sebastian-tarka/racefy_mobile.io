import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks';
import { NearbyRoutesList, ScreenContainer } from '../../../components';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { NearbyRoute } from '../../../types/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  nearbyRoutes: NearbyRoute[];
  myRoutes: NearbyRoute[];
  selectedRouteId: number | null;
  onRouteSelect: (route: NearbyRoute) => void;
  onNavigateToLibrary: () => void;
  isLoading: boolean;
  error: string | null;
}

export function RouteSelectionModal({
  visible, onClose, nearbyRoutes, myRoutes, selectedRouteId,
  onRouteSelect, onNavigateToLibrary, isLoading, error,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const dragGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        onClose();
      }
    });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <ScreenContainer>
        <GestureDetector gesture={dragGesture}>
          <TouchableOpacity
            style={[styles.dragHandle, { backgroundColor: colors.cardBackground }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
          </TouchableOpacity>
        </GestureDetector>

        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('recording.selectShadowTrack')}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <NearbyRoutesList
          routes={nearbyRoutes}
          selectedRouteId={selectedRouteId}
          onRouteSelect={(route) => {
            onRouteSelect(route);
            onClose();
          }}
          isLoading={isLoading}
          error={error}
          fillContainer
          listHeader={
            <View style={styles.listHeader}>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('recording.myRoutes', 'My routes')} ({myRoutes.length})
                </Text>
                <TouchableOpacity onPress={onNavigateToLibrary}>
                  <Text style={[styles.libraryLink, { color: colors.primary }]}>
                    {t('routes.openLibrary', 'Library →')}
                  </Text>
                </TouchableOpacity>
              </View>

              {myRoutes.length === 0 && (
                <View style={[styles.emptyMyRoutes, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {t('recording.noSavedRoutes', "You don't have any saved routes yet")}
                  </Text>
                </View>
              )}

              {myRoutes.length > 0 && (
                <View>
                  {myRoutes.map((r) => {
                    const isSelected = selectedRouteId === r.id;
                    return (
                      <TouchableOpacity
                        key={`my-${r.id}`}
                        style={[
                          styles.myRouteItem,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: colors.background,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        onPress={() => {
                          onRouteSelect(r);
                          onClose();
                        }}
                      >
                        <Ionicons name="bookmark" size={18} color={colors.primary} />
                        <View style={styles.myRouteInfo}>
                          <Text style={[styles.myRouteTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {r.title}
                          </Text>
                          <Text style={[styles.myRouteMeta, { color: colors.textMuted }]}>
                            {(r.distance / 1000).toFixed(1)} km
                            {r.elevation_gain > 0 ? ` · ↑${Math.round(r.elevation_gain)} m` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, styles.nearbySectionTitle, { color: colors.textPrimary }]}>
                {t('recording.nearbyRoutes', 'Nearby routes')}
              </Text>
            </View>
          }
        />

        <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.background }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  libraryLink: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyMyRoutes: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  myRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  myRouteInfo: {
    flex: 1,
  },
  myRouteTitle: {
    fontWeight: '600',
  },
  myRouteMeta: {
    fontSize: fontSize.sm,
  },
  divider: {
    height: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  nearbySectionTitle: {
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});