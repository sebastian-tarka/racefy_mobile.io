import type { MentionEntity, MentionMap } from '../types/api';
import { replaceTriggerValues } from 'react-native-controlled-mentions';

// Trigger characters for each mention type
export const MENTION_TRIGGERS = {
  user: '@',
  event: '#',
  activity: '!',
} as const;

// API token patterns: <@ID>, <#ID>, <!ID>
const MENTION_TOKEN_REGEX = /<([@#!])(\d+)>/g;

// Map trigger char to entity type
const TRIGGER_TO_TYPE: Record<string, MentionEntity['type']> = {
  '@': 'user',
  '#': 'event',
  '!': 'activity',
};

// Map trigger char to API prefix
const TYPE_TO_TRIGGER: Record<MentionEntity['type'], string> = {
  user: '@',
  event: '#',
  activity: '!',
};

/**
 * Strip display names from library format before sending to API.
 * Converts: `@[John](5)` → `<@5>`, `#[Event Name](12)` → `<#12>`, `![Activity](3)` → `<!3>`
 */
export function stripMentionsForApi(text: string): string {
  return replaceTriggerValues(text, ({ trigger, id }) => {
    return `<${trigger}${id}>`;
  });
}

/**
 * Convert API token format to library format for editing existing content.
 * Converts: `<@5>` → `@[name](5)` using the mentions map.
 */
export function apiTokensToLibraryFormat(text: string, mentions?: MentionMap): string {
  if (!mentions) return text;
  return text.replace(MENTION_TOKEN_REGEX, (match, trigger, id) => {
    const entity = mentions[`<${trigger}${id}>`] || mentions[`${trigger}${id}`];
    if (entity) {
      return `${trigger}[${entity.name}](${id})`;
    }
    return match;
  });
}

/**
 * Segment type for parsed mention text
 */
export interface MentionSegment {
  type: 'text' | 'mention';
  text: string;
  entity?: MentionEntity;
  trigger?: string;
  id?: string;
}

/**
 * Parse API text with mention tokens into segments for rendering.
 * Input: "Hello <@5> at <#12>"
 * Output: [{ type: 'text', text: 'Hello ' }, { type: 'mention', ... }, ...]
 *
 * Always parses tokens even without a mentions map — unresolved tokens
 * are rendered as styled mention segments with fallback labels.
 */
export function parseMentionTokens(text: string, mentions?: MentionMap): MentionSegment[] {
  if (!text) return [{ type: 'text', text: '' }];

  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    const trigger = match[1];
    const id = match[2];
    const mentionType = TRIGGER_TO_TYPE[trigger] || 'user';

    // API returns keys with angle brackets: <@5>, <#12>, <!3>
    const entity = mentions?.[`<${trigger}${id}>`]
                || mentions?.[`${trigger}${id}`];

    if (entity) {
      segments.push({
        type: 'mention',
        text: entity.type === 'user' ? `@${entity.name}` : entity.name,
        entity,
        trigger,
        id,
      });
    } else {
      // Unresolved token — render as styled mention with trigger+ID as label
      const fallbackLabel = `${trigger}${id}`;
      segments.push({
        type: 'mention',
        text: fallbackLabel,
        entity: {
          type: mentionType,
          id: Number(id),
          name: fallbackLabel,
          url: '',
        },
        trigger,
        id,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ type: 'text', text }];
  }

  return segments;
}

/**
 * Get mention chip color by entity type
 */
export function getMentionColor(type: MentionEntity['type'], colors: any): { text: string; bg: string } {
  switch (type) {
    case 'user':
      return { text: colors.primary, bg: colors.primary + '18' };
    case 'event':
      return { text: colors.info, bg: colors.info + '18' };
    case 'activity':
      return { text: colors.ai || '#A855F7', bg: (colors.ai || '#A855F7') + '18' };
  }
}

/**
 * Navigate to the entity screen based on mention type
 */
export function navigateToMention(navigation: any, entity: MentionEntity) {
  switch (entity.type) {
    case 'user':
      if (entity.username) {
        navigation.navigate('UserProfile', { username: entity.username });
      }
      break;
    case 'event':
      navigation.navigate('EventDetail', { eventId: entity.id });
      break;
    case 'activity':
      navigation.navigate('ActivityDetail', { activityId: entity.id });
      break;
  }
}
