import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { EffortBreakdownCard } from '../EffortBreakdownCard';
import type { ActivityEffortAnalysis, EffortMetrics, EffortPhase } from '../../../types/api';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      primary: '#10b981',
      cardBackground: '#fff',
      textPrimary: '#000',
      textSecondary: '#666',
      textMuted: '#999',
      border: '#eee',
      borderLight: '#f3f4f6',
    },
  }),
}));

jest.mock('../../../hooks/useUnits', () => ({
  useUnits: () => ({
    getDistanceValue: (meters: number) => meters / 1000,
    getDistanceUnit: () => 'km',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const metrics = (over: Partial<EffortMetrics> = {}): EffortMetrics => ({
  pacing_split: 'negative',
  pacing_drift_pct: 3.4,
  effort_trend_pct_per_hour: -1.2,
  terrain_index: 0.21,
  variability: 1.08,
  dispersion: 0.143,
  aerobic_decoupling_pct: null,
  fatigue_score: 31,
  baseline_proxy: 3.214,
  ...over,
});

const phase = (type: EffortPhase['type'], start: number, end: number): EffortPhase => ({
  type,
  start_s: start,
  end_s: end,
  duration_s: end - start,
  start_distance: start,
  end_distance: end,
  avg_effort: 1,
  trend: 0,
  confidence: 0.8,
  avg_speed: null,
  avg_heart_rate: null,
});

const analysis = (over: Partial<ActivityEffortAnalysis> = {}): ActivityEffortAnalysis => ({
  activity_id: 231,
  version: 1,
  quality: 'high',
  quality_reasons: [],
  confidence: 0.82,
  featureless: false,
  phases: [phase('warmup', 0, 1180), phase('steady', 1180, 5000)],
  effort_series: [
    { t: 0, d: 0, e: 0.94 },
    { t: 60, d: 200, e: 1.02 },
    { t: 120, d: 500, e: 1.1 },
  ],
  metrics: metrics(),
  model: 'minetti',
  has_heart_rate: false,
  computed_at: '2026-08-20T09:14:02+00:00',
  ...over,
});

describe('EffortBreakdownCard', () => {
  it('shows the pending state while the backend is still computing', () => {
    render(<EffortBreakdownCard analysis={null} isPending />);

    expect(screen.getByText('activities.effortAnalysis.pending')).toBeTruthy();
  });

  it('renders nothing without an analysis', () => {
    const { toJSON } = render(<EffortBreakdownCard analysis={null} />);

    expect(toJSON()).toBeNull();
  });

  it('renders nothing when the series is too short to plot', () => {
    const { toJSON } = render(
      <EffortBreakdownCard analysis={analysis({ effort_series: [{ t: 0, d: 0, e: 1 }] })} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('reads an even session as a finding, not as an empty state', () => {
    render(<EffortBreakdownCard analysis={analysis({ featureless: true })} />);

    expect(screen.getByText('activities.effortAnalysis.evenEffort')).toBeTruthy();
    expect(screen.queryByText(/effortAnalysis\.summary/)).toBeNull();
  });

  it('lists the phase structure for a varied session', () => {
    render(<EffortBreakdownCard analysis={analysis()} />);

    expect(
      screen.getByText(
        'activities.effortAnalysis.summary:{"phases":"activities.effortAnalysis.phase.warmup → activities.effortAnalysis.phase.steady"}',
      ),
    ).toBeTruthy();
  });

  it('flags a low-quality analysis instead of presenting it as certain', () => {
    render(<EffortBreakdownCard analysis={analysis({ quality: 'low' })} />);

    expect(screen.getByText('activities.effortAnalysis.lowQuality')).toBeTruthy();
  });

  it('leaves out the quality pill when the data is solid', () => {
    render(<EffortBreakdownCard analysis={analysis()} />);

    expect(screen.queryByText('activities.effortAnalysis.lowQuality')).toBeNull();
  });

  it('hides cardiac drift without heart rate — it would be a guess', () => {
    render(<EffortBreakdownCard analysis={analysis()} />);

    expect(screen.queryByText('activities.effortAnalysis.decouplingHint')).toBeNull();
  });

  it('shows cardiac drift once heart rate is available', () => {
    render(
      <EffortBreakdownCard
        analysis={analysis({ metrics: metrics({ aerobic_decoupling_pct: 4.2 }) })}
      />,
    );

    expect(screen.getByText('4.2%')).toBeTruthy();
    expect(screen.getByText('activities.effortAnalysis.decouplingHint')).toBeTruthy();
  });

  it('always names the baseline — an unlabelled 1.0 line is a curve with no zero', () => {
    render(<EffortBreakdownCard analysis={analysis()} />);

    expect(screen.getByText('activities.effortAnalysis.baseline')).toBeTruthy();
  });

  it('reports pacing with its signed drift and the terrain share', () => {
    render(<EffortBreakdownCard analysis={analysis()} />);

    expect(screen.getByText('activities.effortAnalysis.split.negative')).toBeTruthy();
    expect(screen.getByText('+3.4%')).toBeTruthy();
    expect(screen.getByText('21%')).toBeTruthy();
  });
});
