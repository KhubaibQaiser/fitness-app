'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import { ArrowLeft, Badge, IconButton, PageHeader, Tabs, YStack } from '@gymos/ui';
import { AppScreen } from '../shell/app-screen';
import { BreakfastPanel } from './breakfast-panel';
import { DinnerPanel } from './dinner-panel';
import { LunchPanel } from './lunch-panel';
import { OverviewPanel } from './overview-panel';
import { PrepPanel } from './prep-panel';
import { SnacksPanel } from './snacks-panel';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'prep', label: 'Prep' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Coach explainer — Layer 2 meal templates and slot rules. */
export const MealCompositionScreen = () => {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <AppScreen>
      <PageHeader
        title="How meals are planned"
        subtitle="Slot templates and food pools from the live solver"
        leading={
          <Link href="/tools">
            <IconButton icon={<ArrowLeft size={22} color="$color" />} aria-label="Back to tools" />
          </Link>
        }
        action={<Badge tone="primary" label="Layer 2" />}
      />

      <Tabs
        items={[...TABS]}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel="Meal composition sections"
      />

      <YStack key={tab} gap="$4">
        {tab === 'overview' ? <OverviewPanel /> : null}
        {tab === 'breakfast' ? <BreakfastPanel /> : null}
        {tab === 'lunch' ? <LunchPanel /> : null}
        {tab === 'dinner' ? <DinnerPanel /> : null}
        {tab === 'snacks' ? <SnacksPanel /> : null}
        {tab === 'prep' ? <PrepPanel /> : null}
      </YStack>
    </AppScreen>
  );
};
