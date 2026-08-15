import { describe, expect, it } from 'vitest';
import type { CheckIn, Goal, Vitals } from '@gymos/contracts';
import {
  adherenceRatingToScore,
  adherenceScoreTone,
  buildLiveJourney,
  buildPreviewJourney,
  expectedWeightAt,
  journeyTrackStatus,
} from './client-journey';

const goal: Goal = {
  id: 'goal-1',
  preset: 'LOSE',
  rate: 'CONSERVATIVE',
  startDate: '2026-08-01',
  startWeightKg: 80,
  targetWeightKg: 70,
  targetDate: null,
  expectedWeeklyDeltaKg: -0.5,
  initialTargets: null,
  tdeeEstimate: 2500,
  checkinWeekday: 1,
  status: 'ACTIVE',
};

describe('client journey', () => {
  it('maps adherence to a visible 2–10 score and tone', () => {
    expect(adherenceRatingToScore(1)).toBe(2);
    expect(adherenceRatingToScore(5)).toBe(10);
    expect(adherenceRatingToScore(null)).toBeNull();
    expect(adherenceScoreTone(4)).toBe('danger');
    expect(adherenceScoreTone(6)).toBe('warning');
    expect(adherenceScoreTone(8)).toBe('success');
  });

  it('builds a preview journey with start, first check-in, milestones, and target', () => {
    const nodes = buildPreviewJourney(
      {
        startDate: '2026-08-15',
        startWeightKg: 80,
        targetWeightKg: 70,
        expectedWeeklyDeltaKg: -0.5,
      },
      new Date('2026-08-15T00:00:00Z'),
    );
    expect(nodes[0]).toMatchObject({ kind: 'START', state: 'current', weightKg: 80 });
    expect(nodes.some((node) => node.kind === 'NEXT_CHECK_IN')).toBe(true);
    expect(nodes.filter((node) => node.kind === 'MILESTONE')).toHaveLength(3);
    expect(nodes.at(-1)).toMatchObject({ kind: 'TARGET', weightKg: 70 });
  });

  it('does not project a journey for maintain or a wrong-direction target', () => {
    expect(
      buildPreviewJourney({
        startDate: '2026-08-15',
        startWeightKg: 80,
        targetWeightKg: 80,
        expectedWeeklyDeltaKg: 0,
      }),
    ).toHaveLength(1);
    expect(
      buildPreviewJourney({
        startDate: '2026-08-15',
        startWeightKg: 80,
        targetWeightKg: null,
        expectedWeeklyDeltaKg: -0.5,
      }),
    ).toHaveLength(1);
    expect(
      buildPreviewJourney({
        startDate: '2026-08-15',
        startWeightKg: 80,
        targetWeightKg: 70,
        expectedWeeklyDeltaKg: 0.5,
      }),
    ).toHaveLength(1);
  });

  it('projects gain goals upward and deduplicates a first-week milestone', () => {
    const gain = buildPreviewJourney(
      {
        startDate: '2026-08-15',
        startWeightKg: 70,
        targetWeightKg: 74,
        expectedWeeklyDeltaKg: 0.5,
      },
      new Date('2026-08-15T00:00:00Z'),
    );
    expect(gain.at(-1)).toMatchObject({ kind: 'TARGET', weightKg: 74 });
    expect(gain.filter((node) => node.kind === 'MILESTONE')).toHaveLength(3);

    const deduped = buildPreviewJourney(
      {
        startDate: '2026-08-15',
        startWeightKg: 80,
        targetWeightKg: 72,
        expectedWeeklyDeltaKg: -2,
      },
      new Date('2026-08-15T00:00:00Z'),
    );
    expect(deduped.filter((node) => node.kind === 'NEXT_CHECK_IN')).toHaveLength(1);
    expect(deduped.filter((node) => node.kind === 'MILESTONE')).toHaveLength(2);
  });

  it('calculates expected weight and ahead/on-track/behind status', () => {
    const projection = {
      startDate: '2026-08-01',
      startWeightKg: 80,
      targetWeightKg: 70,
      expectedWeeklyDeltaKg: -0.5,
    };
    const at = new Date('2026-08-15T00:00:00Z');
    expect(expectedWeightAt(projection, at)).toBe(79);
    expect(journeyTrackStatus(projection, 78.5, at)).toBe('ahead');
    expect(journeyTrackStatus(projection, 79.1, at)).toBe('on-track');
    expect(journeyTrackStatus(projection, 79.5, at)).toBe('behind');
  });

  it('builds live history, current position, due check-in, and future milestones', () => {
    const checkIns: CheckIn[] = [
      {
        id: 'done',
        clientId: 'client-1',
        goalId: goal.id,
        scheduledFor: '2026-08-08',
        completedAt: '2026-08-08T10:00:00Z',
        vitalsId: 'vital-1',
        adherenceRating: 4,
        coachNotes: 'Strong week',
        engineOutput: {
          type: 'HOLD',
          confidence: 0.8,
          reasons: [],
          actualWeeklyDeltaKg: -0.6,
          expectedWeeklyDeltaKg: -0.5,
        },
        status: 'COMPLETED',
        weightKg: 79.4,
      },
      {
        id: 'due',
        clientId: 'client-1',
        goalId: goal.id,
        scheduledFor: '2026-08-22',
        completedAt: null,
        vitalsId: null,
        adherenceRating: null,
        coachNotes: null,
        engineOutput: null,
        status: 'DUE',
        weightKg: null,
      },
    ];
    const vitals: Vitals[] = [
      {
        id: 'vital-1',
        recordedAt: '2026-08-15T10:00:00Z',
        weightKg: 79,
        bodyFatPct: null,
        muscleMassKg: null,
        chestCm: null,
        waistCm: null,
        hipCm: null,
        armCm: null,
        armLeftCm: null,
        armRightCm: null,
        thighCm: null,
        thighLeftCm: null,
        thighRightCm: null,
        restingHr: null,
        bpSystolic: null,
        bpDiastolic: null,
        notes: null,
      },
    ];
    const nodes = buildLiveJourney({
      clientId: 'client-1',
      goal,
      checkIns,
      vitals,
      latestWeightKg: 79,
      today: new Date('2026-08-15T00:00:00Z'),
    });

    expect(nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining(['START', 'CHECK_IN', 'CURRENT', 'NEXT_CHECK_IN', 'TARGET']),
    );
    expect(nodes.find((node) => node.id === 'done')).toMatchObject({
      adherenceScore: 8,
      weightKg: 79.4,
    });
    expect(nodes.find((node) => node.kind === 'CURRENT')).toMatchObject({
      trackStatus: 'on-track',
    });
  });

  it('keeps skipped history neutral and identifies an overdue due check-in', () => {
    const skipped: CheckIn = {
      id: 'skipped',
      clientId: 'client-1',
      goalId: goal.id,
      scheduledFor: '2026-08-03',
      completedAt: null,
      vitalsId: null,
      adherenceRating: null,
      coachNotes: null,
      engineOutput: null,
      status: 'SKIPPED',
    };
    const overdue: CheckIn = {
      ...skipped,
      id: 'overdue',
      scheduledFor: '2026-08-10',
      status: 'DUE',
    };
    const nodes = buildLiveJourney({
      clientId: 'client-1',
      goal,
      checkIns: [skipped, overdue],
      vitals: [],
      latestWeightKg: 79,
      today: new Date('2026-08-15T00:00:00Z'),
    });

    expect(nodes.find((node) => node.id === 'skipped')).toMatchObject({
      state: 'skipped',
      title: 'Check-in skipped',
    });
    expect(nodes.find((node) => node.id === 'overdue')).toMatchObject({
      title: 'Check-in overdue',
    });
  });
});
