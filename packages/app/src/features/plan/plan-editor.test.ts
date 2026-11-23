import type * as ReactModule from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanItem } from '@gymos/contracts';
import { PlanEditor } from './plan-editor';

// This package has no component renderer, and the kit pulls in React Native, which Vitest can't
// parse. So every component import becomes a string tag, the hooks return their initial state, and
// calling PlanEditor gives a plain element tree to inspect: a shallow render.
const { setState, tags } = vi.hoisted(() => ({
  setState: vi.fn(),
  tags: (...names: string[]) => Object.fromEntries(names.map((name) => [name, name])),
}));

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactModule>()),
  useState: (initial: unknown) => [initial, setState],
  useEffect: () => undefined,
}));
vi.mock('../../api', () => {
  const mutation = () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() });
  return {
    usePatchPlan: mutation,
    usePublishPlan: mutation,
    useRegenerateMeal: mutation,
    useDownloadDietPlanPdf: mutation,
  };
});
vi.mock('@gymos/platform', () => ({ downloadBlob: vi.fn() }));
vi.mock('@gymos/ui', () =>
  tags(
    'ArrowLeft',
    'Badge',
    'Body',
    'Card',
    'GhostButton',
    'IconButton',
    'Muted',
    'PrimaryButton',
    'Row',
    'SectionTitle',
    'SegmentedControl',
    'Text',
    'XStack',
    'YStack',
  ),
);
vi.mock('solito/link', () => tags('Link'));
vi.mock('../shell/app-screen', () => tags('AppScreen'));
vi.mock('./override-prompt', () => tags('OverridePrompt'));
vi.mock('./plan-food-picker', () => tags('PlanFoodPicker'));
vi.mock('./plan-item-card', () => tags('PlanItemCard'));
vi.mock('./plan-publish-confirm', () => tags('PlanPublishConfirm'));
vi.mock('./plan-title-header', () => tags('PlanTitleHeader'));

type Element = { type: unknown; props: { children?: unknown } & Record<string, unknown> };

const isElement = (node: unknown): node is Element =>
  typeof node === 'object' && node !== null && 'props' in node;

const elements = (node: unknown): Element[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  return isElement(node) ? [node, ...elements(node.props.children)] : [];
};

const text = (node: unknown): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return isElement(node) ? text(node.props.children) : '';
};

const targets = { kcal: 2000, proteinG: 150, fatG: 70, carbsG: 200, fiberG: 30 };
const onGenerate = vi.fn();
type Props = Parameters<typeof PlanEditor>[0];

const render = (overrides: Partial<Props>) => {
  const tree = elements(
    PlanEditor({
      clientId: 'client-1',
      clientName: 'Adnan',
      planId: 'plan-1',
      status: 'DRAFT',
      title: null,
      targets,
      items: [],
      day: 1,
      setDay: vi.fn(),
      version: 1,
      plans: [
        { id: 'plan-1', version: 1, title: null, status: 'DRAFT', targets, publishedAt: null },
      ],
      onSelectPlan: vi.fn(),
      mealCount: 3,
      setMealCount: vi.fn(),
      onGenerate,
      generatePending: false,
      generateError: null,
      generateBlocked: false,
      ...overrides,
    }),
  );
  const all = (type: string) => tree.filter((el) => el.type === type);
  const press = (type: string, label: string) => {
    const button = all(type).find((el) => text(el) === label);
    if (button === undefined) throw new Error(`no ${type} labelled "${label}"`);
    (button.props.onPress as () => void)();
  };
  const pickMealCount = (count: 3 | 4 | 5) => {
    const picker = all('SegmentedControl').find((el) => el.props.ariaLabel === 'Meals per day');
    if (picker === undefined) throw new Error('no meals-per-day picker');
    (picker.props.onChange as (n: number) => void)(count);
  };
  return {
    has: (copy: string) => tree.some((el) => text(el) === copy),
    labels: (type: string) => all(type).map(text),
    press,
    pickMealCount,
  };
};

const item = (day: number, mealIndex: number, mealSlot: PlanItem['mealSlot']): PlanItem => ({
  id: `item-${day}-${mealIndex}`,
  day,
  mealIndex,
  mealSlot,
  mealName: 'Meal',
  foodName: 'Food',
  foodId: 'food-1',
  portionGrams: 100,
  macros: { kcal: 500, proteinG: 35, fatG: 15, carbsG: 50 },
  macrosSource: 'food_db',
  prepNotes: null,
  position: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanEditor with an empty draft (B2)', () => {
  it('offers Generate meals and Add food manually, and no Publish', () => {
    const view = render({});
    expect(view.has('This draft has no meals yet')).toBe(true);
    expect(view.labels('PlanPublishConfirm')).toEqual([]);

    view.press('PrimaryButton', 'Generate meals');
    expect(onGenerate).toHaveBeenCalledWith({ mealCount: 3 });

    view.press('GhostButton', 'Add food manually');
    expect(setState).toHaveBeenCalledWith(0); // opens the food picker on the first meal
  });

  it('shows every meal of the chosen pattern with Add food', () => {
    const view = render({ mealCount: 4 });
    expect(view.labels('SectionTitle')).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner']);
    expect(view.labels('GhostButton').filter((label) => label === 'Add food')).toHaveLength(4);
    expect(view.labels('GhostButton')).not.toContain('Regenerate meal');
    expect(view.labels('GhostButton')).not.toContain('Apply this day to all days');
  });

  it('reshapes its sections when the meals-per-day picker changes', () => {
    const setMealCount = vi.fn();
    render({ mealCount: 3, setMealCount }).pickMealCount(5);
    expect(setMealCount).toHaveBeenCalledWith(5);
    expect(render({ mealCount: 5, setMealCount }).labels('SectionTitle')).toEqual([
      'Breakfast',
      'Snack',
      'Lunch',
      'Snack',
      'Dinner',
    ]);
  });
});

describe('PlanEditor meal sections', () => {
  const fourMealDay1 = [
    item(1, 0, 'breakfast'),
    item(1, 1, 'lunch'),
    item(1, 2, 'snack'),
    item(1, 3, 'dinner'),
  ];

  it("follow the plan's pattern, not the meals-per-day picker", () => {
    const view = render({ items: fourMealDay1, mealCount: 3 });
    expect(view.labels('SectionTitle')).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner']);
    expect(view.has('This draft has no meals yet')).toBe(false);
    expect(view.labels('PlanPublishConfirm')).toHaveLength(1);
  });

  it('keep every meal of a partly emptied plan, whatever the picker says', () => {
    // A 5-meal plan with only breakfast left also fits the 3- and 4-meal templates.
    const breakfastOnly = [item(1, 0, 'breakfast')];
    const fiveMeals = ['Breakfast', 'Snack', 'Lunch', 'Snack', 'Dinner'];
    expect(render({ items: breakfastOnly, mealCount: 3 }).labels('SectionTitle')).toEqual(
      fiveMeals,
    );
    expect(render({ items: breakfastOnly, mealCount: 4 }).labels('SectionTitle')).toEqual(
      fiveMeals,
    );
  });

  it('keep Add food on a day that has no items', () => {
    const view = render({ items: fourMealDay1, day: 2 });
    expect(view.labels('SectionTitle')).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner']);
    expect(view.labels('GhostButton').filter((label) => label === 'Add food')).toHaveLength(4);
  });
});
