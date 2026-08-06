/** Pilot action set. Every API route declares exactly one of these. */
export const ACTIONS = [
  'client.list',
  'client.read',
  'client.manage',
  'notes.read',
  'notes.write',
  'vitals.read',
  'vitals.write',
  'photos.read',
  'photos.write',
  'dietary.read',
  'dietary.write',
  'goal.read',
  'goal.manage',
  'checkin.read',
  'checkin.write',
  'plan.read',
  'plan.generate',
  'plan.edit',
  'plan.publish',
  'foods.read',
  'notification.read',
  'config.read',
  'data.export',
  'data.erase',
] as const;

export type Action = (typeof ACTIONS)[number];
