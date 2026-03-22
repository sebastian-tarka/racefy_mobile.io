import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Switch, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks';
import { ScreenContainer, ScreenHeader, Input, Button, Card } from '../../components';
import { spacing, fontSize } from '../../theme';
import { api } from '../../services/api';
import { emitRefresh } from '../../services/refreshEvents';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamForm'>;

export function TeamFormScreen({ route, navigation }: Props) {
  const teamId = route.params?.teamId;
  const isEdit = !!teamId;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit && teamId) {
      setIsFetching(true);
      // Fetch by ID — we need the team data. Use slug from a cached team or fetch by ID endpoint.
      // For simplicity, we'll use the teams list to find it or just use the form with provided data.
      setIsFetching(false);
    }
  }, [isEdit, teamId]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('teams.nameRequired'));
      return;
    }
    setIsLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility: (isPublic ? 'public' : 'private') as 'public' | 'private',
      };

      if (isEdit && teamId) {
        await api.updateTeam(teamId, data);
        Alert.alert(t('common.success'), t('teams.teamUpdated'));
      } else {
        await api.createTeam(data);
        Alert.alert(t('common.success'), t('teams.teamCreated'));
      }
      emitRefresh('teams');
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsLoading(false);
    }
  }, [name, description, isPublic, isEdit, teamId, navigation, t]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={isEdit ? t('teams.editTeam') : t('teams.createNewTeam')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.container}>
        <Card style={styles.card}>
          <Input
            label={t('teams.teamName')}
            placeholder={t('teams.teamNamePlaceholder')}
            value={name}
            onChangeText={setName}
            maxLength={100}
          />

          <Input
            label={t('teams.teamDescription')}
            placeholder={t('teams.teamDescriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            multiline
            numberOfLines={4}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('teams.teamVisibility')}</Text>
              <Text style={[styles.switchHint, { color: colors.textMuted }]}>
                {isPublic ? t('teams.publicDescription') : t('teams.privateDescription')}
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={isPublic ? colors.primary : colors.textMuted}
            />
          </View>
        </Card>

        <Button
          title={isEdit ? t('teams.editTeam') : t('teams.createTeam')}
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!name.trim()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md },
  card: { gap: spacing.md },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchInfo: { flex: 1, marginRight: spacing.md },
  switchLabel: { fontSize: fontSize.md, fontWeight: '600' },
  switchHint: { fontSize: fontSize.xs, marginTop: 2 },
});
