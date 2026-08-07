'use client';

import { useState } from 'react';
import { FormSection, Tabs, YStack } from '@gymos/ui';
import { ToolsBmi } from './tools-bmi';
import { ToolsMacroSplit } from './tools-macro-split';
import { ToolsTdee } from './tools-tdee';

const TABS = [
  { id: 'tdee', label: 'TDEE' },
  { id: 'bmi', label: 'BMI' },
  { id: 'macros', label: 'Macro split' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Interactive nutrition calculators — TDEE, BMI, macro split. */
export const ToolsCalculators = () => {
  const [tab, setTab] = useState<TabId>('tdee');

  return (
    <FormSection title="Calculators">
      <Tabs
        items={[...TABS]}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel="Calculator type"
      />
      <YStack key={tab} gap="$3">
        {tab === 'tdee' ? <ToolsTdee /> : null}
        {tab === 'bmi' ? <ToolsBmi /> : null}
        {tab === 'macros' ? <ToolsMacroSplit /> : null}
      </YStack>
    </FormSection>
  );
};
