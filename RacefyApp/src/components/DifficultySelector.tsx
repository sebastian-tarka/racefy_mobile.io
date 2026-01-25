import React from 'react';
import { ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OptionSelector, OptionItem } from './OptionSelector';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';

export interface DifficultySelectorProps {
  value: DifficultyLevel;
  onChange: (difficulty: DifficultyLevel) => void;
  disabled?: boolean;
  label?: string;
  showLabel?: boolean;
  containerStyle?: ViewStyle;
  testID?: string;
}

const DIFFICULTY_OPTIONS: DifficultyLevel[] = [
  'all_levels',
  'beginner',
  'intermediate',
  'advanced',
];

export function DifficultySelector({
  value,
  onChange,
  disabled,
  label,
  showLabel = true,
  containerStyle,
  testID,
}: DifficultySelectorProps) {
  const { t } = useTranslation();

  const options: OptionItem<DifficultyLevel>[] = DIFFICULTY_OPTIONS.map((difficulty) => ({
    value: difficulty,
    label: t(`difficulty.${difficulty}`),
  }));

  return (
    <OptionSelector
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      label={label || t('eventForm.difficulty')}
      showLabel={showLabel}
      containerStyle={containerStyle}
      testID={testID}
    />
  );
}
