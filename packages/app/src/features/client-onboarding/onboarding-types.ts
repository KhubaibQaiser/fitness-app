import type { Restriction } from '@gymos/contracts';
import type { GoalPreset, GoalRate } from '@gymos/core/nutrition';
import type { ActivityLevelValue } from '../../lib/activity-levels';

export type OnboardingDraft = {
  name: string;
  sex: 'F' | 'M';
  dob: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  phone: string;
  email: string;
  activityLevel: ActivityLevelValue;
  weightKg: string;
  waistCm: string;
  chestCm: string;
  hipCm: string;
  armLeftCm: string;
  armRightCm: string;
  thighLeftCm: string;
  thighRightCm: string;
  goalPreset: GoalPreset;
  goalRate: GoalRate;
  startWeightKg: string;
  targetWeightKg: string;
  medicalConditions: string;
  physicianClearanceRequired: boolean;
  pregnant: boolean;
  signaturePngBase64: string | null;
  dietary: Restriction[];
};

export const INITIAL_DRAFT: OnboardingDraft = {
  name: '',
  sex: 'M',
  dob: '',
  heightCm: '',
  heightFt: '',
  heightIn: '',
  phone: '',
  email: '',
  activityLevel: '1.55',
  weightKg: '',
  waistCm: '',
  chestCm: '',
  hipCm: '',
  armLeftCm: '',
  armRightCm: '',
  thighLeftCm: '',
  thighRightCm: '',
  goalPreset: 'LOSE',
  goalRate: 'STANDARD',
  startWeightKg: '',
  targetWeightKg: '',
  medicalConditions: '',
  physicianClearanceRequired: false,
  pregnant: false,
  signaturePngBase64: null,
  dietary: [],
};

export const STEP_META = [
  { id: 'identity', title: 'Identity', subtitle: 'Who are we coaching?' },
  { id: 'height', title: 'Height', subtitle: 'Used for calorie targets' },
  { id: 'contact', title: 'Contact', subtitle: 'WhatsApp preferred' },
  { id: 'body', title: 'Body', subtitle: 'Weight and measurements' },
  { id: 'goal', title: 'Goal', subtitle: 'Direction and pace' },
  { id: 'medical', title: 'Medical', subtitle: 'Safety gates' },
  { id: 'diet', title: 'Diet', subtitle: 'Allergies and preferences' },
  { id: 'sign', title: 'Review', subtitle: 'Overview, journey and e-sign' },
] as const;

export type StepId = (typeof STEP_META)[number]['id'];
