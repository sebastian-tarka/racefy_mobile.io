import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { splitCommentaryMentions, type CommentaryMention } from '../utils/mentions';

/**
 * Commentary text (rendered inside a parent <Text>) with each participant's "@handle" from the API
 * `mentions` as a tappable link to their profile. Any other "@word" stays plain text.
 */
export function CommentaryMentionText({
  text,
  mentions,
}: {
  text: string | null | undefined;
  mentions?: CommentaryMention[] | null;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <>
      {splitCommentaryMentions(text, mentions).map((segment, i) =>
        segment.username ? (
          <Text
            key={i}
            style={{ color: colors.primary, fontWeight: '600' }}
            onPress={() => navigation.navigate('UserProfile', { username: segment.username })}
            accessibilityRole="link"
          >
            {segment.text}
          </Text>
        ) : (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}
