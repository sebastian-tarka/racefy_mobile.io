import { getActivityVerdict } from '../activityVerdict';
import type { ActivityAnalysisSummary } from '../../types/api';

const summary = (over: Partial<ActivityAnalysisSummary> = {}): ActivityAnalysisSummary => ({
  quality: 'high',
  confidence: 0.8,
  featureless: false,
  phase_count: 3,
  phase_types: ['warmup', 'steady', 'cooldown'],
  fatigue_score: 30,
  pacing_split: 'even',
  aerobic_decoupling_pct: null,
  ...over,
});

describe('getActivityVerdict', () => {
  it('says nothing when there is no summary at all', () => {
    expect(getActivityVerdict(undefined)).toBeNull();
    expect(getActivityVerdict({ analysis_summary: undefined })).toBeNull();
    // Not loaded and not computed have to behave the same.
    expect(getActivityVerdict({ analysis_summary: null })).toBeNull();
  });

  it('stays silent on a low-quality analysis — a badge cannot carry a caveat', () => {
    const s = summary({ quality: 'low', pacing_split: 'negative', phase_types: ['peak'] });
    expect(getActivityVerdict({ analysis_summary: s })).toBeNull();
  });

  it('puts a negative split ahead of every other signal', () => {
    const s = summary({
      pacing_split: 'negative',
      phase_types: ['intervals', 'peak'],
      featureless: true,
    });
    expect(getActivityVerdict({ analysis_summary: s })).toBe('strongFinish');
  });

  it('prefers intervals over a peak phase', () => {
    const s = summary({ phase_types: ['warmup', 'intervals', 'peak'] });
    expect(getActivityVerdict({ analysis_summary: s })).toBe('intervals');
  });

  it('falls back to the peak phase', () => {
    const s = summary({ phase_types: ['warmup', 'peak', 'cooldown'] });
    expect(getActivityVerdict({ analysis_summary: s })).toBe('hardEffort');
  });

  it('reads an even session as a result, not as nothing', () => {
    expect(getActivityVerdict({ analysis_summary: summary({ featureless: true }) })).toBe(
      'evenPacing',
    );
  });

  it('reports a faded finish only when nothing better applies', () => {
    const s = summary({ pacing_split: 'positive' });
    expect(getActivityVerdict({ analysis_summary: s })).toBe('fadedFinish');
  });

  it('returns null for an unremarkable even-split session', () => {
    expect(getActivityVerdict({ analysis_summary: summary() })).toBeNull();
  });
});
