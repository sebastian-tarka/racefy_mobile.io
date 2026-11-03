import type { TFunction } from 'i18next';
import { isApiError } from './errors';

/** Server limits (config/chat.php in the API): 5 files per message, 10 MB each. */
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** A file picked on the phone, before upload. */
export interface LocalAttachment {
  /** Stable id for list keys and removal. */
  localId: string;
  kind: 'image' | 'file';
  uri: string;
  name: string;
  mimeType: string;
  /** Bytes when known (document picker, file info); null when not. */
  size: number | null;
  width?: number;
  height?: number;
}

type AttachmentRejection = 'too_many' | 'too_large' | 'unsupported_type';

interface AttachmentValidation {
  accepted: LocalAttachment[];
  rejected: { file: LocalAttachment; reason: AttachmentRejection }[];
}

const IMAGE_MIME = /^image\/(jpe?g|png|webp)$/i;
const DOCUMENT_EXT = /\.(pdf|gpx)$/i;

/**
 * True when a picked document can be sent: PDF or GPX by extension. The MIME type is not
 * trusted on purpose — Android reports GPX as `application/octet-stream` or `text/xml`
 * depending on the app that wrote it. The server checks the content anyway.
 */
export function isAllowedDocument(name: string): boolean {
  return DOCUMENT_EXT.test(name.trim());
}

/** MIME type for the multipart part; the server ignores it but Laravel's parser wants one. */
export function documentMimeType(name: string, reported: string | null | undefined): string {
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.gpx$/i.test(name)) return 'application/gpx+xml';
  return reported || 'application/octet-stream';
}

/**
 * Applies the client-side limits to files being added to `existing`: unsupported types
 * and files over 10 MB are dropped with a reason, and only as many as still fit under 5
 * are accepted (the rest are `too_many`).
 */
export function validateAttachments(
  existing: LocalAttachment[],
  incoming: LocalAttachment[],
): AttachmentValidation {
  const accepted: LocalAttachment[] = [];
  const rejected: AttachmentValidation['rejected'] = [];
  let room = MAX_ATTACHMENTS - existing.length;

  for (const file of incoming) {
    const supported =
      file.kind === 'image' ? IMAGE_MIME.test(file.mimeType) : isAllowedDocument(file.name);
    if (!supported) {
      rejected.push({ file, reason: 'unsupported_type' });
      continue;
    }
    if (file.size !== null && file.size > MAX_ATTACHMENT_BYTES) {
      rejected.push({ file, reason: 'too_large' });
      continue;
    }
    if (room <= 0) {
      rejected.push({ file, reason: 'too_many' });
      continue;
    }
    accepted.push(file);
    room -= 1;
  }

  return { accepted, rejected };
}

/** One sentence summarizing why some picked files were not added, or null when all were. */
export function rejectionMessage(
  rejected: AttachmentValidation['rejected'],
  t: TFunction,
): string | null {
  if (rejected.length === 0) return null;
  const reasons = new Set(rejected.map((r) => r.reason));
  const parts: string[] = [];
  if (reasons.has('unsupported_type')) parts.push(t('messaging.attachments.unsupportedType'));
  if (reasons.has('too_large')) parts.push(t('messaging.attachments.tooLarge', { max: 10 }));
  if (reasons.has('too_many'))
    parts.push(t('messaging.attachments.tooMany', { max: MAX_ATTACHMENTS }));
  return parts.join(' ');
}

/**
 * The multipart body for POST /conversations/{id}/messages: `attachments[]` parts plus the
 * caption as `content` when non-empty. React Native's FormData takes `{uri, name, type}`.
 */
export function buildMessageFormData(caption: string, files: LocalAttachment[]): FormData {
  const formData = new FormData();
  const trimmed = caption.trim();
  if (trimmed) formData.append('content', trimmed);
  for (const file of files) {
    formData.append('attachments[]', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);
  }
  return formData;
}

/**
 * The message to show for a failed upload. A 422 carries the server's own reason under
 * `errors.attachments` or `errors.attachments.N` (type rejected by content, flag off…);
 * anything else gets the generic translation.
 */
export function uploadErrorMessage(error: unknown, t: TFunction): string {
  if (isApiError(error) && error.status === 422 && error.errors) {
    const key = Object.keys(error.errors)
      .sort()
      .find((k) => k === 'attachments' || k.startsWith('attachments.') || k === 'content');
    const first = key ? error.errors[key]?.[0] : undefined;
    if (first) return first;
    if (error.message) return error.message;
  }
  return t('messaging.attachments.sendFailed');
}
