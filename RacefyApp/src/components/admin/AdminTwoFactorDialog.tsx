import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input } from '../Input';
import { Button } from '../Button';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/errors';
import { borderRadius, fontSize, spacing } from '../../theme';

interface Props {
  visible: boolean;
  /** Called after the server accepted the code; the caller retries its request. */
  onVerified: () => void;
  onClose: () => void;
}

/**
 * Asks an admin for the authenticator (or recovery) code when the admin API answers
 * `code: "admin_2fa_required"`. One accepted code unlocks the current token for the
 * admin API (POST /admin/2fa/verify, 12 h on the server).
 */
export function AdminTwoFactorDialog({ visible, onVerified, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setCode('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.verifyAdminTwoFactor(code.trim());
      setCode('');
      onVerified();
    } catch (e) {
      setError(getErrorMessage(e, t('admin.twoFactor.invalid')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={close}>
          <Pressable
            style={[styles.card, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('admin.twoFactor.title')}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {t('admin.twoFactor.message')}
            </Text>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder={t('admin.twoFactor.placeholder')}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              textContentType="oneTimeCode"
              error={error}
              onSubmitEditing={submit}
            />
            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="outline"
                onPress={close}
                style={styles.action}
              />
              <Button
                title={t('admin.twoFactor.verify')}
                onPress={submit}
                loading={submitting}
                disabled={!code.trim()}
                style={styles.action}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  body: { fontSize: fontSize.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
