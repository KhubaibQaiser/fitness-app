import { type NarrativeInput } from '../types';

/** Golden NarrativeInput fixtures for offline eval / CI gate. */
export const GOLDEN_NARRATIVE_FIXTURES: readonly NarrativeInput[] = [
  {
    locale: 'en',
    cuisineContext: 'pakistani',
    verbosity: 'standard',
    days: [
      {
        day: 1,
        meals: [
          {
            slot: 'breakfast',
            items: [
              { foodName: 'Egg (whole, boiled)', grams: 100 },
              { foodName: 'Roti (whole wheat)', grams: 60 },
            ],
          },
          {
            slot: 'lunch',
            items: [
              { foodName: 'Chicken breast (skinless, cooked)', grams: 160 },
              { foodName: 'Rice (basmati, cooked)', grams: 150 },
              { foodName: 'Kachumber salad', grams: 100 },
            ],
          },
          {
            slot: 'dinner',
            items: [
              { foodName: 'Dal (masoor, cooked)', grams: 180 },
              { foodName: 'Roti (whole wheat)', grams: 80 },
              { foodName: 'Yogurt (plain, low-fat)', grams: 100 },
            ],
          },
        ],
      },
    ],
  },
  {
    locale: 'en',
    cuisineContext: 'pakistani',
    verbosity: 'terse',
    days: [
      {
        day: 1,
        meals: [
          {
            slot: 'breakfast',
            items: [{ foodName: 'Oats (rolled, dry)', grams: 50 }],
          },
          {
            slot: 'lunch',
            items: [
              { foodName: 'Fish (rohu, cooked)', grams: 140 },
              { foodName: 'Potato (boiled)', grams: 120 },
            ],
          },
          {
            slot: 'dinner',
            items: [
              { foodName: 'Paneer (fresh)', grams: 100 },
              { foodName: 'Roti (whole wheat)', grams: 70 },
            ],
          },
          {
            slot: 'snack',
            items: [{ foodName: 'Apple', grams: 150 }],
          },
        ],
      },
    ],
  },
  {
    locale: 'ur',
    cuisineContext: 'pakistani',
    verbosity: 'standard',
    days: [
      {
        day: 1,
        meals: [
          {
            slot: 'breakfast',
            items: [
              { foodName: 'Banana', grams: 118 },
              { foodName: 'Milk (low-fat)', grams: 200 },
            ],
          },
          {
            slot: 'lunch',
            items: [
              { foodName: 'Beef (lean, cooked)', grams: 120 },
              { foodName: 'Rice (basmati, cooked)', grams: 140 },
            ],
          },
          {
            slot: 'dinner',
            items: [
              { foodName: 'Chickpea (boiled)', grams: 160 },
              { foodName: 'Roti (whole wheat)', grams: 80 },
            ],
          },
        ],
      },
    ],
  },
];
