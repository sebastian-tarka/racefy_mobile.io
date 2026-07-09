import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../theme';

export interface LanguageOption {
  code: string;
  label: string;
}

interface LanguageDropdownProps {
  value: string;
  options: LanguageOption[];
  onChange: (code: string) => void;
  /** Optional leading icon (defaults to a globe). */
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Compact language selector that scales past two languages: shows the active
 * language as a pill and opens a dropdown list. Replaces inline chip rows.
 */
export function LanguageDropdown({
  value,
  options,
  onChange,
  icon = 'globe-outline',
}: LanguageDropdownProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  if (options.length <= 1) return null;

  const active = options.find((o) => o.code === value) ?? options[0];

  const select = (code: string) => {
    setOpen(false);
    if (code !== value) onChange(code);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={15} color={colors.textSecondary} />
        <Text style={[styles.triggerText, { color: colors.textPrimary }]}>
          {active.code.toUpperCase()}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.menu,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <ScrollView bounces={false}>
              {options.map((option) => {
                const isActive = option.code === value;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={styles.item}
                    onPress={() => select(option.code)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        {
                          color: isActive ? colors.primary : colors.textPrimary,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  triggerText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  menu: {
    minWidth: 220,
    maxHeight: 320,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemText: {
    fontSize: fontSize.md,
  },
});
