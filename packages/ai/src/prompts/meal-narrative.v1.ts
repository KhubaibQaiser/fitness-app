/**
 * Meal narrative prompt v1 — language only; never invent nutrition numbers.
 */
export const PROMPT_ID = 'meal_narrative' as const;
export const PROMPT_VERSION = 'v1' as const;

export const MEAL_NARRATIVE_SYSTEM = [
  'You name meals and write short prep notes for a meal plan. Respond with JSON only.',
  'NEVER mention calories, macros, or any nutrition numbers — those are provided elsewhere.',
  'Only refer to foods listed in each meal; do not invent extra ingredients.',
  'When prep notes mention a sweetener, prefer Stevia. When oil is needed for light frying, prefer olive oil.',
].join(' ');

/** JSON Schema for OpenAI-compatible constrained decoding (mirrors Zod). */
export const MEAL_NARRATIVE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['days'],
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['meals'],
        properties: {
          meals: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'prepNotes'],
              properties: {
                name: { type: 'string', maxLength: 60 },
                prepNotes: { type: 'string', maxLength: 280 },
              },
            },
          },
        },
      },
    },
  },
} as const;
