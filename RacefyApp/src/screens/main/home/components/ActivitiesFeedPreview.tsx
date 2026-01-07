import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ActivitySliderCard } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuth } from '../../../../hooks/useAuth';
import { api } from '../../../../services/api';
import { spacing, fontSize } from '../../../../theme';
import type { Activity } from '../../../../types/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

interface ActivitiesFeedPreviewProps {
  onActivityPress: (activityId: number) => void;
  onViewAllPress: () => void;
  onLoginPress: () => void;
  limit?: number;
}

export function ActivitiesFeedPreview({
  onActivityPress,
  onViewAllPress,
  onLoginPress,
  limit = 3,
}: ActivitiesFeedPreviewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleActivityPress = (activityId: number) => {
    if (isAuthenticated) {
      onActivityPress(activityId);
    } else {
      onLoginPress();
    }
  };

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = isAuthenticated
          ? await api.getActivitiesFeed({ per_page: limit })
          : await api.getActivitiesDiscover({ per_page: limit });
        setActivities(response.data);
      } catch (error) {
        console.log('Failed to fetch activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [limit, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('home.recentActivities')}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('home.recentActivities')}
        </Text>
        {isAuthenticated && (
          <TouchableOpacity onPress={onViewAllPress}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>
              {t('common.viewAll')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ActivitySliderCard
              activity={item}
              onPress={() => handleActivityPress(item.id)}
              isAuthenticated={isAuthenticated}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  listContent: {
    paddingRight: spacing.md,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
});
