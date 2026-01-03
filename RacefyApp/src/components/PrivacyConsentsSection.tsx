import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { triggerHaptic } from '../hooks/useHaptics';
import { getUserConsents, updateOptionalConsent } from '../services/legal';
import { spacing, fontSize } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import type { UserConsent, LegalDocumentType } from '../types/legal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper to get human-readable titles
const getDocumentTitle = (type: LegalDocumentType, t: (key: string) => string): string => {
  const titles: Record<LegalDocumentType, string> = {
    terms: t('legal.terms'),
    privacy: t('legal.privacy'),
    marketing: t('legal.marketing'),
    cookies: t('legal.cookies'),
  };
  return titles[type] || type;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export function PrivacyConsentsSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [consents, setConsents] = useState<UserConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const response: any = await getUserConsents();
      console.log('[PrivacyConsentsSection] API response:', JSON.stringify(response, null, 2));

      // Handle different response structures
      let consentsData: UserConsent[] = [];
      if (Array.isArray(response)) {
        // API returns array directly
        consentsData = response;
      } else if (response?.consents && Array.isArray(response.consents)) {
        // API returns { consents: [...] }
        consentsData = response.consents;
      } else if (response?.data?.consents && Array.isArray(response.data.consents)) {
        // API returns { data: { consents: [...] } }
        consentsData = response.data.consents;
      } else if (response?.data && Array.isArray(response.data)) {
        // API returns { data: [...] }
        consentsData = response.data;
      }

      console.log('[PrivacyConsentsSection] Parsed consents:', consentsData.length);
      setConsents(consentsData);
    } catch (err) {
      console.error('[PrivacyConsentsSection] Failed to load consents:', err);
      setConsents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (consent: UserConsent) => {
    if (consent.is_required) return;

    try {
      setUpdating(consent.version_id);
      triggerHaptic();
      await updateOptionalConsent(consent.version_id, !consent.accepted);

      // Update local state
      setConsents(prev =>
        prev.map(c =>
          c.version_id === consent.version_id
            ? { ...c, accepted: !c.accepted, accepted_at: !c.accepted ? new Date().toISOString() : null }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to update consent:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  const validConsents = consents?.filter(Boolean) ?? [];

  // Show link to legal documents even when no consents
  if (validConsents.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('legal.noConsentsYet')}
        </Text>
        <TouchableOpacity
          style={[styles.viewDocsButton, { borderTopColor: colors.border }]}
          onPress={() => {
            triggerHaptic();
            navigation.navigate('LegalDocuments', {});
          }}
        >
          <Text style={[styles.viewDocsText, { color: colors.primary }]}>
            {t('legal.viewFullDocuments')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {validConsents.map((consent, index) => (
        <View
          key={consent.version_id}
          style={[
            styles.consentRow,
            { borderBottomColor: colors.border },
            index === validConsents.length - 1 && styles.lastRow,
          ]}
        >
          <View style={styles.consentInfo}>
            <Text style={[styles.consentTitle, { color: colors.textPrimary }]}>
              {getDocumentTitle(consent.type, t)}
            </Text>
            <Text style={[styles.consentMeta, { color: colors.textSecondary }]}>
              v{consent.version}
              {consent.accepted_at && ` • ${t('legal.acceptedOn')} ${formatDate(consent.accepted_at)}`}
            </Text>
          </View>

          {consent.is_required ? (
            <View
              style={[
                styles.badge,
                consent.accepted
                  ? { backgroundColor: colors.success + '20' }
                  : { backgroundColor: colors.error + '20' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: consent.accepted ? colors.success : colors.error },
                ]}
              >
                {consent.accepted ? t('legal.accepted') : t('legal.required')}
              </Text>
            </View>
          ) : (
            <Switch
              value={consent.accepted}
              onValueChange={() => handleToggle(consent)}
              disabled={updating === consent.version_id}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={consent.accepted ? colors.primary : colors.white}
            />
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.viewDocsButton, { borderTopColor: colors.border }]}
        onPress={() => {
          triggerHaptic();
          navigation.navigate('LegalDocuments', {});
        }}
      >
        <Text style={[styles.viewDocsText, { color: colors.primary }]}>
          {t('legal.viewFullDocuments')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    padding: spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  consentInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  consentTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  consentMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  viewDocsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  viewDocsText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
});
