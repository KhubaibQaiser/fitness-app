'use client';

import { Link } from 'solito/link';
import { Body, Card, ChevronRight, Muted, PageHeader, XStack, YStack } from '@gymos/ui';
import { AppScreen } from '../shell/app-screen';
import { ToolsCalculators } from './tools-calculators';

const TOOLS = [
  {
    href: '/tools/targets' as const,
    title: 'How targets are calculated',
    subtitle: 'BMR, TDEE, goals, macros, fiber, and safety floors — live from the engine.',
  },
  {
    href: '/tools/meals' as const,
    title: 'How meals are planned',
    subtitle: 'Breakfast allowlist, lunch/dinner patterns, snacks, and prep defaults.',
  },
] as const;

/** Coach tools hub — calculators plus nutrition explainers. */
export const ToolsScreen = () => (
  <AppScreen avoidKeyboard>
    <PageHeader title="Tools" subtitle="Nutrition utility calculators" />

    <YStack gap="$3">
      {TOOLS.map((tool) => (
        <Link key={tool.href} href={tool.href}>
          <Card interactive gap="$2" minHeight={56} justifyContent="center">
            <XStack alignItems="center" justifyContent="space-between" gap="$3">
              <YStack flex={1} gap={2} minWidth={0}>
                <Body fontFamily="$heading" fontWeight="700">
                  {tool.title}
                </Body>
                <Muted fontSize={13}>{tool.subtitle}</Muted>
              </YStack>
              <ChevronRight size={20} color="$textMuted" />
            </XStack>
          </Card>
        </Link>
      ))}
    </YStack>

    <ToolsCalculators />
  </AppScreen>
);
