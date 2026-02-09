import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { logger } from '../services/logger';
import { parseMentionTokens, getMentionColor, navigateToMention } from '../utils/mentions';
import type { MentionMap } from '../types/api';

// API token pattern for quick check
const HAS_MENTION_TOKEN = /<[@#!]\d+>/;

interface MentionTextProps {
  text: string;
  mentions?: MentionMap;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function MentionText({ text, mentions, style, numberOfLines }: MentionTextProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // No text at all — render empty
  if (!text) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Quick check: if text has no mention tokens, skip parsing
  if (!HAS_MENTION_TOKEN.test(text)) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Debug: log what the API provides so we can verify the mentions map format
  if (__DEV__) {
    logger.debug('general', '[MentionText] rendering', {
      text: text.substring(0, 100),
      mentionsKeys: mentions ? Object.keys(mentions) : 'none',
    });
  }

  // Always parse tokens (works with or without mentions map)
  const segments = parseMentionTokens(text, mentions);

  // If parsing found nothing special, render plain
  if (segments.length === 1 && segments[0].type === 'text') {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <Text key={index}>{segment.text}</Text>;
        }

        const entity = segment.entity!;
        const mentionColors = getMentionColor(entity.type, colors);

        return (
          <Text
            key={index}
            style={{
              color: mentionColors.text,
              backgroundColor: mentionColors.bg,
              fontWeight: '600',
            }}
            onPress={() => navigateToMention(navigation, entity)}
          >
            {' '}{segment.text}{' '}
          </Text>
        );
      })}
    </Text>
  );
}
