import type { CheckIn, Goal, Vitals } from '@gymos/contracts';

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * 7;
const MILESTONES = [0.25, 0.5, 0.75] as const;

export type JourneyNodeKind =
  'START' | 'CHECK_IN' | 'CURRENT' | 'NEXT_CHECK_IN' | 'MILESTONE' | 'TARGET';

export type JourneyNodeState = 'past' | 'current' | 'future' | 'skipped';
export type JourneyTrackStatus = 'ahead' | 'on-track' | 'behind';

export type JourneyNode = {
  id: string;
  kind: JourneyNodeKind;
  state: JourneyNodeState;
  title: string;
  date: string;
  weightKg: number | null;
  projected: boolean;
  detail: string | null;
  href?: string;
  adherenceScore?: number;
  expectedWeeklyDeltaKg?: number;
  actualWeeklyDeltaKg?: number;
  trackStatus?: JourneyTrackStatus;
};

export type JourneyProjectionInput = {
  startDate: string;
  startWeightKg: number;
  targetWeightKg: number | null;
  expectedWeeklyDeltaKg: number;
};

const parseDate = (value: string): Date | null => {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? date : null;
};

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addWeeks = (date: Date, weeks: number): Date =>
  new Date(date.getTime() + weeks * MS_PER_WEEK);

const weeksBetween = (from: Date, to: Date): number =>
  Math.max(0, (to.getTime() - from.getTime()) / MS_PER_WEEK);

export const adherenceRatingToScore = (rating: number | null): number | null => {
  if (rating === null || !Number.isFinite(rating)) return null;
  const normalized = Math.min(5, Math.max(1, Math.round(rating)));
  return normalized * 2;
};

export const adherenceScoreTone = (score: number): 'danger' | 'warning' | 'success' => {
  if (score <= 4) return 'danger';
  if (score <= 6) return 'warning';
  return 'success';
};

export const expectedWeightAt = (projection: JourneyProjectionInput, at: Date): number | null => {
  const start = parseDate(projection.startDate);
  if (start === null) return null;
  const raw = projection.startWeightKg + projection.expectedWeeklyDeltaKg * weeksBetween(start, at);
  if (projection.targetWeightKg === null) return raw;
  return projection.expectedWeeklyDeltaKg < 0
    ? Math.max(projection.targetWeightKg, raw)
    : projection.expectedWeeklyDeltaKg > 0
      ? Math.min(projection.targetWeightKg, raw)
      : projection.startWeightKg;
};

export const journeyTrackStatus = (
  projection: JourneyProjectionInput,
  actualWeightKg: number,
  at: Date,
): JourneyTrackStatus => {
  const expected = expectedWeightAt(projection, at);
  if (expected === null || projection.expectedWeeklyDeltaKg === 0) return 'on-track';
  const progressDifference =
    (actualWeightKg - expected) * Math.sign(projection.expectedWeeklyDeltaKg);
  if (progressDifference > 0.25) return 'ahead';
  if (progressDifference < -0.25) return 'behind';
  return 'on-track';
};

const projectionIsValid = (projection: JourneyProjectionInput): boolean => {
  if (projection.targetWeightKg === null || projection.expectedWeeklyDeltaKg === 0) return false;
  const requiredDelta = projection.targetWeightKg - projection.startWeightKg;
  return (
    requiredDelta === 0 || Math.sign(requiredDelta) === Math.sign(projection.expectedWeeklyDeltaKg)
  );
};

const projectedNodes = ({
  projection,
  fromDate,
  fromWeightKg,
  includeFirstCheckIn,
}: {
  projection: JourneyProjectionInput;
  fromDate: Date;
  fromWeightKg: number;
  includeFirstCheckIn: boolean;
}): JourneyNode[] => {
  if (!projectionIsValid(projection) || projection.targetWeightKg === null) return [];
  const remainingDelta = projection.targetWeightKg - fromWeightKg;
  if (
    remainingDelta === 0 ||
    Math.sign(remainingDelta) !== Math.sign(projection.expectedWeeklyDeltaKg)
  ) {
    return [];
  }
  const totalWeeks = Math.abs(remainingDelta / projection.expectedWeeklyDeltaKg);
  if (!Number.isFinite(totalWeeks)) return [];
  const fullDelta = projection.targetWeightKg - projection.startWeightKg;
  const currentProgress =
    fullDelta === 0
      ? 1
      : Math.min(1, Math.max(0, (fromWeightKg - projection.startWeightKg) / fullDelta));

  const nodes: JourneyNode[] = [];
  if (includeFirstCheckIn && totalWeeks > 1) {
    nodes.push({
      id: 'projected-first-check-in',
      kind: 'NEXT_CHECK_IN',
      state: 'future',
      title: 'First check-in',
      date: isoDate(addWeeks(fromDate, 1)),
      weightKg: fromWeightKg + projection.expectedWeeklyDeltaKg,
      projected: true,
      detail: 'Review adherence, weight and how the plan feels.',
    });
  }

  for (const ratio of MILESTONES) {
    if (ratio <= currentProgress) continue;
    const milestoneWeight = projection.startWeightKg + fullDelta * ratio;
    const weeks = Math.abs((milestoneWeight - fromWeightKg) / projection.expectedWeeklyDeltaKg);
    if (includeFirstCheckIn && Math.abs(weeks - 1) < 0.45) continue;
    nodes.push({
      id: `milestone-${Math.round(ratio * 100)}`,
      kind: 'MILESTONE',
      state: 'future',
      title: `${Math.round(ratio * 100)}% milestone`,
      date: isoDate(addWeeks(fromDate, weeks)),
      weightKg: milestoneWeight,
      projected: true,
      detail: 'Projected from the selected weekly pace.',
    });
  }

  nodes.push({
    id: 'target',
    kind: 'TARGET',
    state: 'future',
    title: 'Goal target',
    date: isoDate(addWeeks(fromDate, totalWeeks)),
    weightKg: projection.targetWeightKg,
    projected: true,
    detail: 'Estimated date — progress and adherence can move this.',
  });
  return nodes;
};

export const buildPreviewJourney = (
  projection: JourneyProjectionInput,
  today = new Date(),
): JourneyNode[] => [
  {
    id: 'start',
    kind: 'START',
    state: 'current',
    title: 'Starting point',
    date: isoDate(today),
    weightKg: projection.startWeightKg,
    projected: false,
    detail: 'Your plan begins here.',
  },
  ...projectedNodes({
    projection: { ...projection, startDate: isoDate(today) },
    fromDate: today,
    fromWeightKg: projection.startWeightKg,
    includeFirstCheckIn: true,
  }),
];

const checkInNode = (clientId: string, checkIn: CheckIn): JourneyNode => {
  const score = adherenceRatingToScore(checkIn.adherenceRating);
  const completed = checkIn.status === 'COMPLETED';
  return {
    id: checkIn.id,
    kind: 'CHECK_IN',
    state: checkIn.status === 'SKIPPED' ? 'skipped' : 'past',
    title: checkIn.status === 'SKIPPED' ? 'Check-in skipped' : 'Check-in complete',
    date: checkIn.completedAt?.slice(0, 10) ?? checkIn.scheduledFor,
    weightKg: checkIn.weightKg ?? null,
    projected: false,
    detail:
      checkIn.engineOutput?.narrative?.coachSummary ??
      checkIn.coachNotes ??
      (completed ? (checkIn.engineOutput?.type.replaceAll('_', ' ') ?? null) : null),
    ...(completed ? { href: `/clients/${clientId}/check-ins/${checkIn.id}` } : {}),
    ...(score !== null ? { adherenceScore: score } : {}),
    ...(checkIn.engineOutput?.expectedWeeklyDeltaKg !== undefined
      ? { expectedWeeklyDeltaKg: checkIn.engineOutput.expectedWeeklyDeltaKg }
      : {}),
    ...(checkIn.engineOutput?.actualWeeklyDeltaKg !== undefined
      ? { actualWeeklyDeltaKg: checkIn.engineOutput.actualWeeklyDeltaKg }
      : {}),
  };
};

export const buildLiveJourney = ({
  clientId,
  goal,
  checkIns,
  vitals,
  latestWeightKg,
  today = new Date(),
}: {
  clientId: string;
  goal: Goal;
  checkIns: CheckIn[];
  vitals: Vitals[];
  latestWeightKg: number | null;
  today?: Date;
}): JourneyNode[] => {
  const projection: JourneyProjectionInput = {
    startDate: goal.startDate,
    startWeightKg: goal.startWeightKg,
    targetWeightKg: goal.targetWeightKg,
    expectedWeeklyDeltaKg: goal.expectedWeeklyDeltaKg,
  };
  const completed = checkIns
    .filter((item) => item.status !== 'DUE')
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .map((item) => checkInNode(clientId, item));
  const latestVital = [...vitals]
    .filter((item) => item.weightKg !== null)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  const currentWeight = latestWeightKg ?? latestVital?.weightKg ?? goal.startWeightKg;
  const expectedCurrent = expectedWeightAt(projection, today);
  const currentStatus = journeyTrackStatus(projection, currentWeight, today);
  const due = checkIns
    .filter((item) => item.status === 'DUE')
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
  const dueDate = due !== undefined ? parseDate(due.scheduledFor) : null;
  const dueIsOverdue = dueDate !== null && dueDate.getTime() < today.getTime();

  const currentNode: JourneyNode = {
    id: 'current',
    kind: 'CURRENT',
    state: 'current',
    title: 'You are here',
    date: isoDate(today),
    weightKg: currentWeight,
    projected: false,
    trackStatus: currentStatus,
    detail:
      expectedCurrent === null
        ? 'Current position in the active plan.'
        : `${currentStatus === 'ahead' ? 'Ahead of' : currentStatus === 'behind' ? 'Behind' : 'Aligned with'} the expected ${expectedCurrent.toFixed(1)} kg path.`,
  };

  const dueNode: JourneyNode[] =
    due === undefined
      ? []
      : [
          {
            id: due.id,
            kind: 'NEXT_CHECK_IN',
            state: 'future',
            title: dueIsOverdue ? 'Check-in overdue' : 'Next check-in',
            date: due.scheduledFor,
            weightKg: null,
            projected: false,
            detail: dueIsOverdue
              ? 'Complete this check-in to keep the projection current.'
              : 'Log weight, adherence and coach notes.',
            href: `/clients/${clientId}/check-in`,
          },
        ];
  const futureNodes = projectedNodes({
    projection,
    fromDate: today,
    fromWeightKg: currentWeight,
    includeFirstCheckIn: false,
  });

  return [
    {
      id: 'start',
      kind: 'START',
      state: 'past',
      title: 'Goal started',
      date: goal.startDate,
      weightKg: goal.startWeightKg,
      projected: false,
      detail: 'Baseline for this journey.',
    },
    ...completed,
    currentNode,
    ...dueNode,
    ...futureNodes,
  ];
};
