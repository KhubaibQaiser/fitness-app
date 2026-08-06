export const ROLES = [
  'PLATFORM_OPERATOR',
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'OUTLET_ADMIN',
  'COACH_MANAGER',
  'COACH',
  'FRONT_DESK',
  'INSTRUCTOR',
  'CLIENT',
  'GUARDIAN',
] as const;

export type Role = (typeof ROLES)[number];
