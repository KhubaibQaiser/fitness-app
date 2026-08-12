export const ACTIVITY_LEVELS = [
  { value: '1.2', label: 'Sedentary' },
  { value: '1.375', label: 'Light' },
  { value: '1.55', label: 'Moderate' },
  { value: '1.725', label: 'Very' },
  { value: '1.9', label: 'Athlete' },
] as const;

export type ActivityLevelValue = (typeof ACTIVITY_LEVELS)[number]['value'];

export const ACTIVITY_OPTIONS = ACTIVITY_LEVELS.map((row) => ({
  value: Number(row.value) as 1.2 | 1.375 | 1.55 | 1.725 | 1.9,
  label: row.label,
}));
