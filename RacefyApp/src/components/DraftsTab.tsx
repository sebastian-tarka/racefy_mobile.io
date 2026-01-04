import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDrafts } from '../hooks/useDrafts';
import { DraftPostCard } from './DraftPostCard';
import { EmptyState } from './EmptyState';
import { Loading } from './Loading';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';
import type { DraftPost } from '../types/api';

interface DraftsTabProps {
  isOwnProfile: boolean;
  onPublishSuccess?: () => void;
  onEditDraft?: (draft: DraftPost) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

export function DraftsTab({
  isOwnProfile,
  onPublishSuccess,
  onEditDraft,
  ListHeaderComponent,
}: DraftsTabProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    drafts,
    isLoading,
    isRefreshing,
    hasMore,
    fetchDrafts,
    refresh,
    loadMore,
    publishDraft,
    deleteDraft,
  } = useDrafts();

  const [publishingId, setPublishingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOwnProfile) {
      fetchDrafts(true);
    }
  }, [isOwnProfile]);

  const handlePublish = (draft: DraftPost) => {
    Alert.alert(
      t('drafts.confirmPublishTitle'),
      t('drafts.confirmPublish'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('drafts.publish'),
          onPress: async () => {
            setPublishingId(draft.id);
            try {
              await publishDraft(draft.id);
              Alert.alert(t('common.success'), t('drafts.published'));
              onPublishSuccess?.();
            } catch (error) {
              Alert.alert(t('common.error'), t('drafts.publishFailed'));
              console.error('[DraftsTab] Publish error:', error);
            } finally {
              setPublishingId(null);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleEdit = (draft: DraftPost) => {
    if (onEditDraft) {
      onEditDraft(draft);
    }
  };

  const handleDelete = (draft: DraftPost) => {
    Alert.alert(
      t('drafts.confirmDeleteTitle'),
      t('drafts.confirmDelete'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          onPress: async () => {
            try {
              await deleteDraft(draft.id);
              // Silently succeed - item removed from list is feedback enough
            } catch (error) {
              Alert.alert(t('common.error'), t('drafts.deleteFailed'));
              console.error('[DraftsTab] Delete error:', error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderDraft = ({ item }: { item: DraftPost }) => (
    <DraftPostCard
      post={item}
      onPublish={() => handlePublish(item)}
      onEdit={() => handleEdit(item)}
      onDelete={() => handleDelete(item)}
      isPublishing={publishingId === item.id}
    />
  );

  const renderEmpty = () => {
    if (isLoading) {
      return <Loading message={t('drafts.loadingDrafts')} />;
    }

    return (
      <EmptyState
        icon="document-outline"
        title={t('drafts.noDrafts')}
        message={t('drafts.noDraftsDesc')}
      />
    );
  };

  const renderFooter = () => {
    if (!isLoading || isRefreshing) return null;
    return (
      <View style={styles.footer}>
        <Loading message={t('common.loadingMore')} />
      </View>
    );
  };

  if (!isOwnProfile) {
    return null;
  }

  return (
    <FlatList
      data={drafts}
      renderItem={renderDraft}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={[
        styles.listContent,
        drafts.length === 0 && styles.emptyContent,
      ]}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
