import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTeams, useMyTeams, useAuth, useTheme, useSubscription } from '../../hooks';
import { ScreenContainer, ScreenHeader, TeamCard } from '../../components';
import { useRefreshOn } from '../../services/refreshEvents';
import { spacing, fontSize } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamsList'>;

export function TeamsListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const { hasRemaining, features, usage } = useSubscription();

  const [activeTab, setActiveTab] = useState<'my' | 'all'>(isAuthenticated ? 'my' : 'all');

  const myTeamsHook = useMyTeams();
  const allTeamsHook = useTeams();

  useEffect(() => {
    if (activeTab === 'my' && isAuthenticated) {
      myTeamsHook.fetchMyTeams();
    } else if (activeTab === 'all') {
      allTeamsHook.fetchTeams(true);
    }
  }, [activeTab]);

  // Auto-refresh when teams data changes (create, delete, leave, etc.)
  const refreshAll = useCallback(() => {
    if (isAuthenticated) myTeamsHook.fetchMyTeams();
    allTeamsHook.fetchTeams(true);
  }, [isAuthenticated, myTeamsHook.fetchMyTeams, allTeamsHook.fetchTeams]);

  useRefreshOn('teams', refreshAll);

  const handleTeamPress = useCallback((slug: string) => {
    navigation.navigate('TeamDetail', { slug });
  }, [navigation]);

  const handleCreate = useCallback(() => {
    if (!hasRemaining('teams_max')) {
      navigation.navigate('Paywall', { feature: 'teams' });
      return;
    }
    navigation.navigate('TeamForm', {});
  }, [navigation, hasRemaining]);

  const handleSearch = useCallback((text: string) => {
    allTeamsHook.setSearch(text);
    // Debounced fetch handled by effect or button
  }, [allTeamsHook]);

  useEffect(() => {
    if (activeTab === 'all') {
      const timeout = setTimeout(() => allTeamsHook.fetchTeams(true), 500);
      return () => clearTimeout(timeout);
    }
  }, [allTeamsHook.search]);

  const renderTab = (tab: 'my' | 'all', label: string) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const teams = activeTab === 'my' ? myTeamsHook.teams : allTeamsHook.teams;
  const isLoading = activeTab === 'my' ? myTeamsHook.isLoading : allTeamsHook.isLoading;
  const isRefreshing = activeTab === 'my' ? myTeamsHook.isRefreshing : allTeamsHook.isRefreshing;
  const onRefresh = activeTab === 'my' ? myTeamsHook.refresh : allTeamsHook.refresh;

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('teams.teams')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={isAuthenticated ? (
          <TouchableOpacity onPress={handleCreate} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
        ) : undefined}
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {isAuthenticated && renderTab('my', t('teams.myTeams'))}
        {renderTab('all', t('teams.allTeams'))}
      </View>

      {/* Limit info (my tab only) */}
      {activeTab === 'my' && isAuthenticated && (
        <View style={[styles.limitInfo, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.limitText, { color: colors.textMuted }]}>
            {t('teams.teamsUsage', {
              used: usage.teams_max ?? 0,
              max: features.teams_max === -1 ? '∞' : features.teams_max,
            })}
          </Text>
        </View>
      )}

      {/* Search (all tab only) */}
      {activeTab === 'all' && (
        <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('teams.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={allTeamsHook.search}
            onChangeText={handleSearch}
          />
          {allTeamsHook.search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={teams}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TeamCard team={item} onPress={() => handleTeamPress(item.slug)} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        onEndReached={activeTab === 'all' ? allTeamsHook.loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {activeTab === 'my' ? t('teams.noMyTeams') : t('teams.noTeams')}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ padding: spacing.lg }} /> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabText: { fontSize: fontSize.sm, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.md, marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, paddingVertical: 4 },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.md },
  emptyText: { fontSize: fontSize.md },
  limitInfo: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  limitText: { fontSize: fontSize.xs, textAlign: 'right' },
});
