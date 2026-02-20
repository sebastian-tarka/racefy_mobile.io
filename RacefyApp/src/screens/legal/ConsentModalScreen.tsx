import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, ScreenContainer } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../services/logger';
import { getCurrentLanguage } from '../../i18n';
import {
  getCurrentDocuments,
  getAvailableLanguages,
  submitConsent,
} from '../../services/legal';
import { spacing, fontSize } from '../../theme';
import type { LegalDocument, LegalDocumentType } from '../../types/legal';

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

export function ConsentModalScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { setConsentComplete } = useAuth();

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [languages, setLanguages] = useState<string[]>(['en', 'pl']);
  const [selectedLanguage, setSelectedLanguage] = useState(getCurrentLanguage());
  const [consents, setConsents] = useState<Record<number, boolean>>({});
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [selectedLanguage]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docsResponse, langsResponse] = await Promise.all([
        getCurrentDocuments(selectedLanguage),
        getAvailableLanguages(),
      ]);

      // Extract documents and languages from responses
      const docs = docsResponse?.data ?? [];
      const langs = langsResponse?.supported ?? ['en', 'pl'];

      if (!Array.isArray(docs)) {
        logger.error('api', 'Invalid documents response - not an array', { docs });
        setError(t('legal.loadError'));
        return;
      }

      setDocuments(docs);
      setLanguages(Array.isArray(langs) ? langs : ['en', 'pl']);

      // Initialize consents (all unchecked)
      const initialConsents: Record<number, boolean> = {};
      docs.forEach(doc => {
        initialConsents[doc.version_id] = false;
      });
      setConsents(initialConsents);
    } catch (err) {
      logger.error('api', 'Failed to load documents', { error: err });
      setError(t('legal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleConsent = (versionId: number) => {
    setConsents(prev => ({ ...prev, [versionId]: !prev[versionId] }));
  };

  const toggleExpand = (versionId: number) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  const allRequiredAccepted = documents
    .filter(d => d.is_required)
    .every(d => consents[d.version_id]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await submitConsent({ consents });
      setConsentComplete();
    } catch (err) {
      logger.error('api', 'Failed to submit consent', { error: err });
      setError(t('legal.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('legal.consentTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('legal.consentDescription')}
        </Text>
      </View>

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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {documents.map(doc => (
          <View
            key={doc.version_id}
            style={[styles.docCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <View style={styles.docHeader}>
              <Switch
                value={consents[doc.version_id]}
                onValueChange={() => toggleConsent(doc.version_id)}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={consents[doc.version_id] ? colors.primary : colors.white}
              />
              <View style={styles.docInfo}>
                <Text style={[styles.docTitle, { color: colors.textPrimary }]}>
                  {getDocumentTitle(doc.type, t)}
                  {doc.is_required && <Text style={[styles.required, { color: colors.error }]}> *</Text>}
                </Text>
                <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                  v{doc.version} • {doc.language.toUpperCase()}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => toggleExpand(doc.version_id)} style={styles.viewContentButton}>
              <Text style={[styles.viewContent, { color: colors.primary }]}>
                {expandedDocs.has(doc.version_id) ? t('legal.hideContent') : t('legal.viewContent')}
              </Text>
              <Ionicons
                name={expandedDocs.has(doc.version_id) ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>

            {expandedDocs.has(doc.version_id) && (
              <View style={[styles.docContent, { backgroundColor: colors.borderLight }]}>
                <Text style={[styles.contentText, { color: colors.textPrimary }]}>
                  {doc.content}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.requiredNote, { color: colors.textSecondary }]}>
          {t('legal.requiredNote')}
        </Text>

        {error && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}

        <Button
          title={submitting ? t('common.pleaseWait') : t('legal.accept')}
          onPress={handleSubmit}
          disabled={!allRequiredAccepted || submitting}
          loading={submitting}
          style={styles.submitButton}
        />
      </View>
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
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  languageRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  langButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  langText: {
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  docCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  docTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  docMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  required: {
    fontWeight: '600',
  },
  viewContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  viewContent: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  docContent: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
  },
  contentText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  requiredNote: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  error: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.xs,
  },
});
