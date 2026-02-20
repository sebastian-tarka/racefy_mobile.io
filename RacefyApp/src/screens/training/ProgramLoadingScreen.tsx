import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import { Button, ScreenContainer } from '../../components';
import type { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'ProgramLoading'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

const POLL_INTERVAL = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds

export function ProgramLoadingScreen({ navigation, route }: Props) {
  const { programId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    let isMounted = true;

    const checkProgramStatus = async () => {
      try {
        const program = await api.getProgram(programId);

        // Check if program is null/undefined
        if (!program) {
          logger.error('training', 'Program is null/undefined', { programId });
          if (isMounted) {
            clearPolling();
            setError(t('training.errors.programNotFound'));
          }
          return;
        }

        logger.debug('training', 'Program status check', {
          programId,
          status: program.status,
          hasProgram: !!program,
        });

        if (!isMounted) return;

        if (program.status === 'active') {
          // Program is ready! Navigate to weeks list
          logger.info('training', 'Program is active, navigating to weeks list', { programId });
          clearPolling();
          navigation.replace('TrainingWeeksList');
        } else if (program.status === 'failed') {
          // Program generation failed
          logger.error('training', 'Program generation failed', { programId });
          clearPolling();
          setError(t('training.errors.generationFailed'));
        }
        // If status is 'pending' or 'processing', keep polling
      } catch (err: any) {
        logger.error('training', 'Failed to check program status', {
          error: err,
          status: err.status,
          message: err.message,
        });
        if (isMounted) {
          clearPolling();
          setError(err.message || t('training.errors.loadingFailed'));
        }
      }
    };

    const startPolling = () => {
      // Initial check
      checkProgramStatus();

      // Set up polling interval
      pollIntervalRef.current = setInterval(checkProgramStatus, POLL_INTERVAL);

      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        clearPolling();
        if (isMounted) {
          setError(t('training.errors.timeout'));
        }
      }, TIMEOUT);
    };

    const clearPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    startPolling();

    return () => {
      isMounted = false;
      clearPolling();
    };
  }, [programId, navigation, t]);

  const handleRetry = () => {
    setError(null);
    navigation.replace('ProgramLoading', { programId });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.content}>
          <View style={[styles.errorIconContainer, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="alert-circle" size={64} color={colors.error} />
          </View>

          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            {t('training.errors.title')}
          </Text>

          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error}
          </Text>

          <View style={styles.errorButtons}>
            <Button
              title={t('common.tryAgain')}
              onPress={handleRetry}
              fullWidth
            />
            <Button
              title={t('common.goBack')}
              onPress={handleGoBack}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="fitness" size={64} color={colors.primary} />
        </View>

        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('training.loading.title')}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('training.loading.subtitle')}
        </Text>

        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  spinner: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorMessage: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  errorButtons: {
    width: '100%',
    gap: spacing.md,
  },
});
