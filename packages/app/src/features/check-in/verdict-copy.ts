import { type Verdict } from '@gymos/contracts';

export const VERDICT_COPY: Record<
  Verdict['type'],
  { title: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  HOLD: { title: 'On track. Hold the course', tone: 'success' },
  ADJUST_TARGETS: { title: 'Adjustment recommended', tone: 'warning' },
  ADHERENCE_FOCUS: { title: 'Focus on adherence, not targets', tone: 'warning' },
  PLATEAU_PROTOCOL: { title: 'Plateau. Consider a diet break', tone: 'warning' },
  REFER_REVIEW: { title: 'Red flag. Review before continuing', tone: 'danger' },
  INSUFFICIENT_DATA: { title: 'Not enough data yet', tone: 'neutral' },
};
