'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import { ArrowLeft, Badge, IconButton, PageHeader, Tabs, YStack } from '@gymos/ui';
import { AppScreen } from '../shell/app-screen';
import { CaloriesPanel } from './calories-panel';
import { GoalsPanel } from './goals-panel';
import { MacrosPanel } from './macros-panel';
import { OverviewPanel } from './overview-panel';
import { SafetyPanel } from './safety-panel';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'calories', label: 'Calories' },
  { id: 'goals', label: 'Goals' },
  { id: 'macros', label: 'Macros' },
  { id: 'safety', label: 'Safety' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Coach explainer — numbers imported from Layer 1; tabs keep each topic scannable. */
export const NutritionCriteriaScreen = () => {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <AppScreen>
      <PageHeader
        title="How targets work"
        subtitle="Plain-language guide to the live nutrition engine"
        leading={
          <Link href="/tools">
            <IconButton icon={<ArrowLeft size={22} color="$color" />} aria-label="Back to tools" />
          </Link>
        }
        action={<Badge tone="primary" label="Layer 1" />}
      />

      <Tabs
        items={[...TABS]}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel="Nutrition criteria sections"
      />

      <YStack key={tab} gap="$4">
        {tab === 'overview' ? <OverviewPanel /> : null}
        {tab === 'calories' ? <CaloriesPanel /> : null}
        {tab === 'goals' ? <GoalsPanel /> : null}
        {tab === 'macros' ? <MacrosPanel /> : null}
        {tab === 'safety' ? <SafetyPanel /> : null}
      </YStack>
    </AppScreen>
  );
};
