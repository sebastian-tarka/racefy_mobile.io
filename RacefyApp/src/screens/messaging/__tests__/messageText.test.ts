import type { TFunction } from 'i18next';
import { lastMessagePreview, messageBodyText } from '../messageText';
import type { LastMessage, Message, MessageAttachment } from '../../../types/api';

const t = ((key: string) => key) as unknown as TFunction;

const lastMessage = (overrides: Partial<LastMessage>): LastMessage => ({
  id: 1,
  content: null,
  type: 'text',
  sender_id: 7,
  created_at: '2026-11-03T10:00:00.000Z',
  ...overrides,
});

const message = (overrides: Partial<Message>): Message => ({
  id: 1,
  conversation_id: 3,
  sender: { id: 7, name: 'Ala', username: 'ala', avatar: null },
  content: null,
  type: 'text',
  is_own: false,
  created_at: '2026-11-03T10:00:00.000Z',
  ...overrides,
});

const photo: MessageAttachment = {
  id: 11,
  kind: 'image',
  name: 'IMG_1.jpg',
  mime_type: 'image/jpeg',
  size: 123456,
  width: 1200,
  height: 800,
  url: 'https://racefy.test/api/chat-attachments/11?signature=a',
  thumb_url: 'https://racefy.test/api/chat-attachments/11/thumb?signature=b',
  large_url: 'https://racefy.test/api/chat-attachments/11/large?signature=c',
};

describe('lastMessagePreview', () => {
  it("prefers the server's preview line", () => {
    expect(lastMessagePreview(lastMessage({ preview: '📷 Zdjęcie' }), t)).toBe('📷 Zdjęcie');
    expect(lastMessagePreview(lastMessage({ content: 'hej', preview: 'hej' }), t)).toBe('hej');
  });

  it('falls back to the content on an API without preview', () => {
    expect(lastMessagePreview(lastMessage({ content: 'hej' }), t)).toBe('hej');
    expect(lastMessagePreview(lastMessage({ content: 'hej', preview: null }), t)).toBe('hej');
  });

  it('labels empty activity and attachment messages instead of showing nothing', () => {
    expect(lastMessagePreview(lastMessage({ type: 'activity' }), t)).toBe(
      'messaging.sharedActivity',
    );
    expect(lastMessagePreview(lastMessage({ type: 'attachment' }), t)).toBe('messaging.attachment');
    expect(lastMessagePreview(lastMessage({ type: 'text', content: '  ' }), t)).toBe('');
    expect(lastMessagePreview(null, t)).toBe('');
  });
});

describe('messageBodyText', () => {
  it('returns the text of a text message as is', () => {
    expect(messageBodyText(message({ content: 'hej ' }), t)).toEqual({
      text: 'hej ',
      muted: false,
    });
  });

  it('shows the caption under attachments and nothing when there is none', () => {
    expect(
      messageBodyText(message({ type: 'attachment', attachments: [photo], content: 'look' }), t),
    ).toEqual({ text: 'look', muted: false });
    expect(messageBodyText(message({ type: 'attachment', attachments: [photo] }), t)).toBeNull();
  });

  it('never leaves an unknown or payload-less message as an empty bubble', () => {
    expect(messageBodyText(message({ type: 'attachment' }), t)).toEqual({
      text: 'messaging.unsupportedMessage',
      muted: true,
    });
    expect(messageBodyText(message({ type: 'poll' as Message['type'] }), t)).toEqual({
      text: 'messaging.unsupportedMessage',
      muted: true,
    });
    expect(messageBodyText(message({ type: 'activity' }), t)).toEqual({
      text: 'messaging.sharedActivity',
      muted: true,
    });
  });

  it('keeps an empty text message empty (nothing to show)', () => {
    expect(messageBodyText(message({ type: 'text', content: '' }), t)).toBeNull();
  });
});
