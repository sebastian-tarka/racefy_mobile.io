import type { TFunction } from 'i18next';
import {
  MAX_ATTACHMENT_BYTES,
  buildMessageFormData,
  documentMimeType,
  isAllowedDocument,
  rejectionMessage,
  uploadErrorMessage,
  validateAttachments,
  type LocalAttachment,
} from '../chatAttachments';

const t = ((key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}:${JSON.stringify(opts)}` : key) as unknown as TFunction;

const image = (n: number, overrides: Partial<LocalAttachment> = {}): LocalAttachment => ({
  localId: `img-${n}`,
  kind: 'image',
  uri: `file:///tmp/${n}.jpg`,
  name: `${n}.jpg`,
  mimeType: 'image/jpeg',
  size: 1_000_000,
  width: 2048,
  height: 1536,
  ...overrides,
});

const doc = (name: string, overrides: Partial<LocalAttachment> = {}): LocalAttachment => ({
  localId: `doc-${name}`,
  kind: 'file',
  uri: `file:///tmp/${name}`,
  name,
  mimeType: 'application/octet-stream',
  size: 2_000,
  ...overrides,
});

describe('isAllowedDocument / documentMimeType', () => {
  it('accepts PDF and GPX by extension whatever Android reports as MIME', () => {
    expect(isAllowedDocument('trasa.GPX')).toBe(true);
    expect(isAllowedDocument('regulamin.pdf ')).toBe(true);
    expect(isAllowedDocument('notes.txt')).toBe(false);
    expect(isAllowedDocument('gpx')).toBe(false);
    expect(documentMimeType('trasa.gpx', 'application/octet-stream')).toBe('application/gpx+xml');
    expect(documentMimeType('a.pdf', null)).toBe('application/pdf');
    expect(documentMimeType('x.bin', 'text/plain')).toBe('text/plain');
  });
});

describe('validateAttachments', () => {
  it('keeps supported files under the limits', () => {
    const { accepted, rejected } = validateAttachments([], [image(1), doc('a.pdf')]);
    expect(accepted.map((f) => f.localId)).toEqual(['img-1', 'doc-a.pdf']);
    expect(rejected).toEqual([]);
  });

  it('drops unsupported types and files over 10 MB with a reason', () => {
    const { accepted, rejected } = validateAttachments(
      [],
      [
        image(1, { mimeType: 'image/gif' }),
        doc('notes.txt'),
        image(2, { size: MAX_ATTACHMENT_BYTES + 1 }),
        image(3, { size: null }), // unknown size is allowed; the server decides
      ],
    );
    expect(accepted.map((f) => f.localId)).toEqual(['img-3']);
    expect(rejected.map((r) => [r.file.localId, r.reason])).toEqual([
      ['img-1', 'unsupported_type'],
      ['doc-notes.txt', 'unsupported_type'],
      ['img-2', 'too_large'],
    ]);
  });

  it('accepts only as many as still fit under 5 per message', () => {
    const existing = [image(1), image(2), image(3)];
    const { accepted, rejected } = validateAttachments(existing, [image(4), image(5), image(6)]);
    expect(accepted.map((f) => f.localId)).toEqual(['img-4', 'img-5']);
    expect(rejected).toEqual([{ file: image(6), reason: 'too_many' }]);
  });
});

describe('rejectionMessage', () => {
  it('is null when nothing was rejected and lists each reason once otherwise', () => {
    expect(rejectionMessage([], t)).toBeNull();
    const message = rejectionMessage(
      [
        { file: image(1), reason: 'too_many' },
        { file: image(2), reason: 'too_many' },
        { file: image(3), reason: 'too_large' },
      ],
      t,
    );
    expect(message).toBe(
      'messaging.attachments.tooLarge:{"max":10} messaging.attachments.tooMany:{"max":5}',
    );
  });
});

describe('buildMessageFormData', () => {
  // React Native's FormData records `{uri, name, type}` parts; Node's coerces objects to
  // strings, so the test swaps in a recorder with RN's `getParts()` shape.
  class RecordingFormData {
    private readonly entries: { fieldName: string; [key: string]: unknown }[] = [];
    append(fieldName: string, value: unknown) {
      this.entries.push(
        typeof value === 'string'
          ? { fieldName, string: value }
          : { fieldName, ...(value as Record<string, unknown>) },
      );
    }
    getParts() {
      return this.entries;
    }
  }
  const realFormData = global.FormData;
  beforeAll(() => {
    global.FormData = RecordingFormData as unknown as typeof FormData;
  });
  afterAll(() => {
    global.FormData = realFormData;
  });
  const parts = (fd: FormData) => (fd as unknown as { getParts: () => unknown[] }).getParts();

  it('appends every file as attachments[] and the trimmed caption as content', () => {
    const fd = buildMessageFormData('  hello ', [
      image(1),
      doc('trasa.gpx', { mimeType: 'application/gpx+xml' }),
    ]);
    expect(parts(fd)).toEqual([
      expect.objectContaining({ fieldName: 'content', string: 'hello' }),
      expect.objectContaining({
        fieldName: 'attachments[]',
        uri: 'file:///tmp/1.jpg',
        name: '1.jpg',
        type: 'image/jpeg',
      }),
      expect.objectContaining({
        fieldName: 'attachments[]',
        uri: 'file:///tmp/trasa.gpx',
        name: 'trasa.gpx',
        type: 'application/gpx+xml',
      }),
    ]);
  });

  it('sends no content part for an empty caption', () => {
    const fd = buildMessageFormData('   ', [image(1)]);
    expect(parts(fd).map((p) => (p as { fieldName: string }).fieldName)).toEqual(['attachments[]']);
  });
});

describe('uploadErrorMessage', () => {
  it("shows the server's attachment error from a 422", () => {
    const error = {
      status: 422,
      message: 'The given data was invalid.',
      errors: {
        'attachments.1': ['Plik attachments.1 musi być zdjęciem, PDF-em albo GPX-em.'],
        content: ['za długie'],
      },
    };
    expect(uploadErrorMessage(error, t)).toBe(
      'Plik attachments.1 musi być zdjęciem, PDF-em albo GPX-em.',
    );
    expect(
      uploadErrorMessage(
        { status: 422, message: 'Nope', errors: { attachments: ['Wyłączone'] } },
        t,
      ),
    ).toBe('Wyłączone');
  });

  it('falls back to the generic message for network errors and other statuses', () => {
    expect(uploadErrorMessage(new Error('Network request failed'), t)).toBe(
      'messaging.attachments.sendFailed',
    );
    expect(uploadErrorMessage({ status: 500, message: 'Server Error' }, t)).toBe(
      'messaging.attachments.sendFailed',
    );
  });
});
