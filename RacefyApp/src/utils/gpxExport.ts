import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {Platform} from 'react-native';
import {logger} from '../services/logger';
import type {GpsPoint} from '../types/api';

export interface GpxExportInput {
  /** Activity id used in filename and `<trk><name>`. */
  activityId: number | string;
  /** Human-readable name written into `<metadata><name>`. */
  name?: string;
  /** ISO timestamp written into `<metadata><time>`. */
  startedAt?: string;
  /** Sport label written into `<trk><type>`. */
  sportType?: string;
  /** Raw GPS points (lat/lng/ele/time/speed). */
  points: GpsPoint[];
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildGpxDocument(input: GpxExportInput): string {
  const { activityId, name, startedAt, sportType, points } = input;

  const metadataParts: string[] = [];
  if (name) metadataParts.push(`    <name>${escapeXml(name)}</name>`);
  if (startedAt) metadataParts.push(`    <time>${escapeXml(startedAt)}</time>`);

  const trkParts: string[] = [];
  trkParts.push(`    <name>${escapeXml(name || `activity-${activityId}`)}</name>`);
  if (sportType) trkParts.push(`    <type>${escapeXml(sportType)}</type>`);

  const trkpts = points
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map(p => {
      const segments: string[] = [];
      if (p.ele != null) segments.push(`        <ele>${p.ele}</ele>`);
      if (p.time) segments.push(`        <time>${escapeXml(p.time)}</time>`);
      // Speed and HR are not part of GPX 1.1 core but we emit common Garmin
      // extensions so other tools can recover the data when they want it.
      const extensions: string[] = [];
      if (p.speed != null) extensions.push(`          <gpxtpx:speed>${p.speed}</gpxtpx:speed>`);
      if (p.hr != null) extensions.push(`          <gpxtpx:hr>${p.hr}</gpxtpx:hr>`);
      if (p.cadence != null) extensions.push(`          <gpxtpx:cad>${p.cadence}</gpxtpx:cad>`);
      if (extensions.length > 0) {
        segments.push('        <extensions>');
        segments.push('          <gpxtpx:TrackPointExtension>');
        segments.push(...extensions);
        segments.push('          </gpxtpx:TrackPointExtension>');
        segments.push('        </extensions>');
      }
      const inner = segments.length > 0 ? `\n${segments.join('\n')}\n      ` : '';
      return `      <trkpt lat="${p.lat}" lon="${p.lng}">${inner}</trkpt>`;
    })
    .join('\n');

  return [
    XML_HEADER,
    '<gpx version="1.1" creator="Racefy"',
    '     xmlns="http://www.topografix.com/GPX/1/1"',
    '     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"',
    '     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
    metadataParts.length > 0 ? `  <metadata>\n${metadataParts.join('\n')}\n  </metadata>` : '',
    '  <trk>',
    trkParts.join('\n'),
    '    <trkseg>',
    trkpts,
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
  ]
    .filter(Boolean)
    .join('\n');
}

function gpxFileName(activityId: number | string): string {
  return `racefy-activity-${activityId}.gpx`;
}

/**
 * Write the GPX to a temp file in the app cache directory and return its URI.
 * Callers usually want `exportGpxAndShare` instead.
 */
export async function writeGpxToCache(input: GpxExportInput): Promise<string> {
  const xml = buildGpxDocument(input);
  const uri = `${FileSystem.cacheDirectory}${gpxFileName(input.activityId)}`;
  await FileSystem.writeAsStringAsync(uri, xml, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
}

/**
 * Build the GPX file and present the OS share sheet.
 * Returns true on success, false if the user cancelled or sharing was unavailable.
 */
export async function exportGpxAndShare(input: GpxExportInput): Promise<boolean> {
  if (input.points.length === 0) {
    logger.warn('activity', 'GPX export: no points', { activityId: input.activityId });
    return false;
  }

  try {
    const uri = await writeGpxToCache(input);

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      logger.warn('activity', 'GPX export: Sharing not available on this device', {
        activityId: input.activityId,
        platform: Platform.OS,
      });
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/gpx+xml',
      dialogTitle: 'Export GPX',
      UTI: 'com.topografix.gpx',
    });

    logger.activity('GPX exported', {
      activityId: input.activityId,
      pointsCount: input.points.length,
    });
    return true;
  } catch (err) {
    logger.error('activity', 'GPX export failed', {
      activityId: input.activityId,
      error: err,
    });
    return false;
  }
}