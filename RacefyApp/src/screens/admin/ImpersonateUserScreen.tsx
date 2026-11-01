import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CommonActions } from '@react-navigation/native';
import { Input, Avatar, ScreenHeader, ScreenContainer } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { getErrorCode, getErrorMessage } from '../../utils/errors';
import { AdminTwoFactorDialog } from '../../components/admin/AdminTwoFactorDialog';
import { spacing, fontSize } from '../../theme';
import type { User } from '../../types/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ImpersonateUser'>;

export function ImpersonateUserScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { startImpersonation } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [twoFactorVisible, setTwoFactorVisible] = useState(false);
  // The admin request to repeat once the token passed 2FA.
  const retryAfterTwoFactor = useRef<(() => void) | null>(null);

  /**
   * The admin API refuses a token that has not passed 2FA (`admin_2fa_required`):
   * ask for the code, then repeat the request. Returns true when the error was handled.
   */
  const handleAdminTwoFactor = (error: unknown, retry: () => void): boolean => {
    const code = getErrorCode(error);
    if (code === 'admin_2fa_required') {
      retryAfterTwoFactor.current = retry;
      setTwoFactorVisible(true);
      return true;
    }
    if (code === 'admin_2fa_setup_required') {
      Alert.alert(t('common.error'), getErrorMessage(error, t('admin.twoFactor.setupRequired')));
      return true;
    }
    return false;
  };

  const handleSearch = async (text: string) => {
    setQuery(text);

    if (text.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const users = await api.searchUsersForImpersonation(text);
      setResults(users);
    } catch (error) {
      if (!handleAdminTwoFactor(error, () => handleSearch(text))) {
        Alert.alert(t('common.error'), t('admin.impersonate.searchError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const doImpersonate = async (user: User) => {
    setImpersonating(true);
    try {
      await startImpersonation(user.id);

      // Reset navigation to Home screen to refresh all data with impersonated user
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [{ name: 'Home' }],
                index: 0,
              },
            },
          ],
        }),
      );
    } catch (error) {
      if (!handleAdminTwoFactor(error, () => doImpersonate(user))) {
        Alert.alert(t('common.error'), t('admin.impersonate.startError'));
      }
    } finally {
      setImpersonating(false);
    }
  };

  const handleImpersonate = (user: User) => {
    Alert.alert(
      t('admin.impersonate.confirm.title'),
      t('admin.impersonate.confirm.message', { username: user.username }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.impersonate.confirm.confirm'),
          onPress: () => doImpersonate(user),
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('admin.impersonate.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <View
          style={[
            styles.warning,
            { backgroundColor: colors.warningLight, borderColor: colors.warning },
          ]}
        >
          <Text style={[styles.warningText, { color: colors.textPrimary }]}>
            {t('admin.impersonate.warning')}
          </Text>
        </View>

        <Input
          value={query}
          onChangeText={handleSearch}
          placeholder={t('admin.impersonate.searchPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {loading && <ActivityIndicator style={styles.loader} />}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => handleImpersonate(item)}
              disabled={impersonating}
            >
              <Avatar uri={item.avatar_url} name={item.name} size="lg" />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
                  @{item.username}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading && query.length >= 2 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('admin.impersonate.noResults')}
              </Text>
            ) : null
          }
        />
      </View>

      {impersonating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.overlayText, { color: colors.textPrimary }]}>
            {t('admin.impersonate.starting')}
          </Text>
        </View>
      )}
      <AdminTwoFactorDialog
        visible={twoFactorVisible}
        onClose={() => {
          setTwoFactorVisible(false);
          retryAfterTwoFactor.current = null;
        }}
        onVerified={() => {
          setTwoFactorVisible(false);
          const retry = retryAfterTwoFactor.current;
          retryAfterTwoFactor.current = null;
          retry?.();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.md },
  warning: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  warningText: { fontSize: fontSize.md, lineHeight: 20 },
  loader: { marginVertical: spacing.lg },
  userCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  userInfo: { marginLeft: spacing.md, flex: 1, justifyContent: 'center' },
  userName: { fontSize: fontSize.lg, fontWeight: '600' },
  userUsername: { fontSize: fontSize.md, marginTop: 2 },
  userEmail: { fontSize: fontSize.sm, marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: spacing.xl },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: { marginTop: spacing.md, fontSize: fontSize.lg },
});
