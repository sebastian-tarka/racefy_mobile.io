import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks';
import { ScreenContainer, ScreenHeader, Avatar, Button } from '../../components';
import { spacing, fontSize } from '../../theme';
import { api } from '../../services/api';
import type { User } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteMember'>;

export function InviteMemberScreen({ route, navigation }: Props) {
  const { teamId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.searchUsers(query);
        setResults(response.results.users.data);
      } catch {
        // Silent
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleInvite = useCallback(async (userId: number) => {
    try {
      await api.inviteTeamMember(teamId, userId);
      setInvitedIds(prev => new Set(prev).add(userId));
      Alert.alert(t('common.success'), t('teams.invitationSent'));
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [teamId, t]);

  return (
    <ScreenContainer>
      <ScreenHeader title={t('teams.invitePlayer')} showBack onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={t('teams.searchUserPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isSearching ? (
            <ActivityIndicator style={{ padding: spacing.lg }} />
          ) : query.length >= 2 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('common.noResults')}</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isInvited = invitedIds.has(item.id);
          return (
            <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={styles.userInfo}
                onPress={() => navigation.navigate('UserProfile', { username: item.username })}
              >
                <Avatar uri={item.avatar} name={item.name} size="md" />
                <View>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.userUsername, { color: colors.textMuted }]}>@{item.username}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.inviteBtn,
                  { backgroundColor: isInvited ? colors.border : colors.primary },
                ]}
                onPress={() => handleInvite(item.id)}
                disabled={isInvited}
              >
                <Ionicons name={isInvited ? 'checkmark' : 'person-add'} size={16} color="#fff" />
                <Text style={styles.inviteBtnText}>
                  {isInvited ? t('teams.invited') : t('teams.invitePlayer')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.md, marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, paddingVertical: 4 },
  list: { paddingHorizontal: spacing.md },
  userRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  userName: { fontSize: fontSize.sm, fontWeight: '600' },
  userUsername: { fontSize: fontSize.xs },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  inviteBtnText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '600' },
  emptyText: { textAlign: 'center', padding: spacing.lg, fontSize: fontSize.sm },
});
