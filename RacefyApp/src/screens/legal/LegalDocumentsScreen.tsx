import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, ScreenContainer } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../services/logger';
import { getCurrentLanguage } from '../../i18n';
import { getPublicDocuments, getAvailableLanguages } from '../../services/legal';
import { spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { LegalDocument, LegalDocumentType } from '../../types/legal';

type Props = NativeStackScreenProps<RootStackParamList, 'LegalDocuments'>;

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

export function LegalDocumentsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const initialDocType = route.params?.documentType;

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [languages, setLanguages] = useState<string[]>(['en', 'pl']);
  const [selectedLanguage, setSelectedLanguage] = useState(getCurrentLanguage());
  const [selectedType, setSelectedType] = useState<LegalDocumentType | null>(initialDocType || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [selectedLanguage]);

  useEffect(() => {
    // Auto-select first document type if none selected
    if (!selectedType && documents.length > 0) {
      setSelectedType(documents[0].type);
    }
  }, [documents, selectedType]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docsResponse, langsResponse] = await Promise.all([
        getPublicDocuments(selectedLanguage),
        getAvailableLanguages(),
      ]);

      logger.debug('api', 'LegalDocuments API response', { response: docsResponse });

      // Handle different API response structures
      const response: any = docsResponse;
      let docsData: LegalDocument[] = [];
      if (Array.isArray(response)) {
        docsData = response;
      } else if (response?.documents && Array.isArray(response.documents)) {
        docsData = response.documents;
      } else if (response?.data?.documents && Array.isArray(response.data.documents)) {
        docsData = response.data.documents;
      } else if (response?.data && Array.isArray(response.data)) {
        docsData = response.data;
      }

      logger.debug('api', 'Parsed documents count', { count: docsData.length });

      setDocuments(docsData);
      setLanguages(langsResponse?.supported ?? ['en', 'pl']);
    } catch (err) {
      logger.error('api', 'Failed to load documents', { error: err });
      setError(t('legal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const selectedDocument = (documents ?? []).find(d => d.type === selectedType);
  const documentTypes = [...new Set((documents ?? []).map(d => d.type))];

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('legal.documentsTitle')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('legal.documentsTitle')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={loadDocuments}>
            <Text style={[styles.retryText, { color: colors.primary }]}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('legal.documentsTitle')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('legal.noDocuments')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('legal.documentsTitle')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.headerSection}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('legal.documentsSubtitle')}
        </Text>

        {/* Language Switcher */}
        <View style={styles.languageRow}>
          {languages.map(lang => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langButton,
                { backgroundColor: colors.borderLight, borderColor: colors.border },
                selectedLanguage === lang && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedLanguage(lang)}
            >
              <Text
                style={[
                  styles.langText,
                  { color: colors.textSecondary },
                  selectedLanguage === lang && { color: colors.white },
                ]}
              >
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Document Type Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {documentTypes.map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.tab,
              { borderColor: colors.border },
              selectedType === type && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                selectedType === type && { color: colors.primary, fontWeight: '600' },
              ]}
            >
              {getDocumentTitle(type, t)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Document Content */}
      <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentScroll}>
        {selectedDocument && (
          <View style={[styles.documentCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.documentHeader}>
              <Text style={[styles.documentTitle, { color: colors.textPrimary }]}>
                {getDocumentTitle(selectedDocument.type, t)}
              </Text>
              <View style={styles.documentMeta}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {t('legal.version')}: {selectedDocument.version}
                </Text>
                {selectedDocument.is_required && (
                  <View style={[styles.requiredBadge, { backgroundColor: colors.error + '20' }]}>
                    <Text style={[styles.requiredBadgeText, { color: colors.error }]}>
                      {t('legal.required')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.documentContent, { color: colors.textPrimary }]}>
              {selectedDocument.content || t('legal.noContent')}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  langButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  langText: {
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
  tabsContainer: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: fontSize.sm,
  },
  contentContainer: {
    flex: 1,
  },
  contentScroll: {
    padding: spacing.lg,
  },
  documentCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  documentHeader: {
    padding: spacing.md,
  },
  documentTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize.sm,
  },
  requiredBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  documentContent: {
    padding: spacing.md,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
});
