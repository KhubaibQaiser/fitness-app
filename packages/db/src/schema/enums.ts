import { pgEnum } from 'drizzle-orm/pg-core';

// Mirrors @gymos/core vocabularies. Kept in sync by the rbac/nutrition tests
// importing these arrays would create a core→db dependency, so the db package
// owns its own copies and the API layer asserts equivalence at boot.
export const roleEnum = pgEnum('role', [
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
]);

export const sexEnum = pgEnum('sex', ['F', 'M']);
export const clientStatusEnum = pgEnum('client_status', ['active', 'archived']);
export const coachTierEnum = pgEnum('coach_tier', ['junior', 'senior', 'head']);
export const vitalsSourceEnum = pgEnum('vitals_source', ['coach', 'member', 'import']);
export const photoPoseEnum = pgEnum('photo_pose', ['front', 'side', 'back', 'other']);

export const goalPresetEnum = pgEnum('goal_preset', ['LOSE', 'GAIN', 'MAINTAIN', 'RECOMP']);
export const goalRateEnum = pgEnum('goal_rate', ['CONSERVATIVE', 'STANDARD', 'AGGRESSIVE']);
export const goalStatusEnum = pgEnum('goal_status', [
  'ACTIVE',
  'ACHIEVED',
  'ABANDONED',
  'SUPERSEDED',
]);
export const checkInStatusEnum = pgEnum('check_in_status', ['DUE', 'COMPLETED', 'SKIPPED']);

export const restrictionTypeEnum = pgEnum('restriction_type', [
  'ALLERGY_SEVERE',
  'ALLERGY_MILD',
  'INTOLERANCE',
  'DISLIKE',
  'RELIGIOUS',
  'ETHICAL',
  'MEDICAL',
]);

export const foodSourceEnum = pgEnum('food_source', ['usda', 'curated', 'tenant']);
export const mealSlotEnum = pgEnum('meal_slot', ['breakfast', 'lunch', 'dinner', 'snack']);
export const planStatusEnum = pgEnum('plan_status', [
  'DRAFT',
  'PUBLISHED',
  'SUPERSEDED',
  'NEEDS_REVIEW',
  'ARCHIVED',
]);
export const generationKindEnum = pgEnum('generation_kind', ['INITIAL', 'ADJUSTMENT', 'MANUAL']);
export const generationStatusEnum = pgEnum('generation_status', [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'RETRIED',
  'FELL_BACK',
  'REJECTED',
  'BLOCKED_REQUIRES_OVERRIDE',
  'FAILED',
]);
export const feedbackKindEnum = pgEnum('feedback_kind', [
  'EDIT',
  'SWAP',
  'REGENERATE',
  'PUBLISH_UNCHANGED',
  'ADJUSTMENT_ACCEPTED',
  'ADJUSTMENT_MODIFIED',
  'ADJUSTMENT_REJECTED',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'CHECKIN_DUE',
  'CHECKIN_OVERDUE',
  'OFF_TRACK',
  'RED_FLAG',
  'PLAN_NEEDS_REVIEW',
  'PLAN_PUBLISHED',
  'MILESTONE',
  'SYSTEM',
]);
export const notificationPriorityEnum = pgEnum('notification_priority', ['HIGH', 'NORMAL']);
