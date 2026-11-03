import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MessageAttachments } from '../components/MessageAttachments';
import type { MessageAttachment } from '../../../types/api';

jest.mock('expo-image', () => {
  const ReactLib = require('react');
  return { Image: (props: object) => ReactLib.createElement('ExpoImage', props) };
});
jest.mock('../../../components/ImageViewer', () => {
  const ReactLib = require('react');
  return {
    ImageViewer: ({ uri, visible }: { uri: string; visible: boolean }) =>
      visible ? ReactLib.createElement('ImageViewer', { testID: 'image-viewer', uri }) : null,
  };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));
jest.mock('../../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const photo = (id: number, overrides: Partial<MessageAttachment> = {}): MessageAttachment => ({
  id,
  kind: 'image',
  name: `IMG_${id}.jpg`,
  mime_type: 'image/jpeg',
  size: 123_456,
  width: 1200,
  height: 800,
  url: `https://racefy.test/api/chat-attachments/${id}?s=orig`,
  thumb_url: `https://racefy.test/api/chat-attachments/${id}/thumb?s=t`,
  large_url: `https://racefy.test/api/chat-attachments/${id}/large?s=l`,
  ...overrides,
});

const pdf: MessageAttachment = {
  id: 20,
  kind: 'file',
  name: 'regulamin.pdf',
  mime_type: 'application/pdf',
  size: 1_300_000,
  width: null,
  height: null,
  url: 'https://racefy.test/api/chat-attachments/20?s=orig',
  thumb_url: null,
  large_url: null,
};

describe('MessageAttachments', () => {
  it('shows a photo thumbnail and opens the large variant full screen on tap', () => {
    render(<MessageAttachments attachments={[photo(11)]} isOwn={false} />);

    const thumb = screen.getByTestId('attachment-image-11');
    expect(thumb.findByType('ExpoImage' as never).props.source.uri).toBe(photo(11).thumb_url);
    expect(screen.queryByTestId('image-viewer')).toBeNull();

    fireEvent.press(thumb);
    expect(screen.getByTestId('image-viewer').props.uri).toBe(photo(11).large_url);
  });

  it('falls back to the original URL while variants are not generated yet', () => {
    render(
      <MessageAttachments
        attachments={[photo(12, { thumb_url: null, large_url: null })]}
        isOwn={false}
      />,
    );
    const thumb = screen.getByTestId('attachment-image-12');
    expect(thumb.findByType('ExpoImage' as never).props.source.uri).toBe(photo(12).url);
    fireEvent.press(thumb);
    expect(screen.getByTestId('image-viewer').props.uri).toBe(photo(12).url);
  });

  it('renders every photo of a multi-photo message', () => {
    render(<MessageAttachments attachments={[photo(1), photo(2), photo(3)]} isOwn />);
    expect(screen.getAllByLabelText('messaging.photo')).toHaveLength(3);
  });

  it('shows a file tile with name and size and opens the link in the system browser', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<MessageAttachments attachments={[pdf]} isOwn={false} />);

    expect(screen.getByText('regulamin.pdf')).toBeTruthy();
    expect(screen.getByText('1.3 MB')).toBeTruthy();

    fireEvent.press(screen.getByTestId('attachment-file-20'));
    expect(openURL).toHaveBeenCalledWith(pdf.url);
    openURL.mockRestore();
  });
});
