import React, { useEffect, useState } from 'react';
import { ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OptionSelector, OptionItem } from './OptionSelector';
import {EventRankingMode, RankingModeOption} from '../types/api';
import { logger } from '../services/logger';
import { api } from '../services/api';

export interface EventRankingModeSelectorProps {
  value: EventRankingMode;
  onChange: (difficulty: EventRankingMode) => void;
  disabled?: boolean;
  label?: string;
  showLabel?: boolean;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function EventRankingModeSelector({
  value,
  onChange,
  disabled,
  label,
  showLabel = true,
  containerStyle,
  testID,
}: EventRankingModeSelectorProps) {
  const { t } = useTranslation();
  const [rankingModes, setRankingModes] = useState<RankingModeOption[]>([]);

  useEffect(() => {
    const fetchRankingModes = async () => {
      try {
        const modes = await api.getEventRankingModes();
        logger.debug('api', 'Fetched ranking modes', { modes });
        setRankingModes(modes);
      } catch (error) {
        logger.error('api', 'Failed to fetch ranking modes', { error });
        setRankingModes([]);
      }
    };
    fetchRankingModes();
  }, []);

  const options: OptionItem<EventRankingMode>[] = rankingModes.map((mode) => ({
    value: mode.value,
    label: mode.name,
  }));

  return (
    <OptionSelector
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      label={label || t('eventForm.rankingMode')}
      showLabel={showLabel}
      containerStyle={containerStyle}
      testID={testID}
    />
  );
}
