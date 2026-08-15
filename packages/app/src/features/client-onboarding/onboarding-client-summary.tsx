'use client';

import { formatRestrictionLabel } from '@gymos/core/nutrition';
import type { UnitPrefs } from '@gymos/core/units';
import { Card, Muted, SectionTitle, Text, XStack, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';
import { parseConditions } from './validate-step';

const sexLabel = (sex: 'F' | 'M'): string => (sex === 'F' ? 'Female' : 'Male');

export const OnboardingClientSummary = ({
  draft,
  prefs,
  ageYears,
}: {
  draft: OnboardingDraft;
  prefs: UnitPrefs;
  ageYears: number;
}) => {
  const conditions = parseConditions(draft.medicalConditions);
  const importantDiet = draft.dietary.slice(0, 4).map((item) => formatRestrictionLabel(item.code));
  const medical = [
    draft.pregnant ? 'Pregnant' : null,
    draft.physicianClearanceRequired ? 'Physician clearance required' : null,
    ...conditions,
  ].filter((item): item is string => item !== null);

  return (
    <YStack gap="$3">
      <YStack gap="$1">
        <SectionTitle>Client overview</SectionTitle>
        <Text fontFamily="$heading" fontSize={22} fontWeight="800" color="$color">
          Review the starting point
        </Text>
        <Muted>Confirm the essentials before the client signs.</Muted>
      </YStack>

      <Card backgroundColor="$elevatedBg" gap="$4" padding="$4">
        <YStack gap={2}>
          <Text fontFamily="$heading" fontSize={19} fontWeight="800" color="$color">
            {draft.name || 'New client'}
          </Text>
          <Muted>
            {sexLabel(draft.sex)} · {ageYears} years
            {draft.dob.trim() === '' ? ' (age assumed)' : ''}
          </Muted>
        </YStack>

        <XStack flexWrap="wrap" gap="$4">
          {[
            {
              label: 'Height',
              value:
                prefs.height === 'cm'
                  ? `${draft.heightCm} cm`
                  : `${draft.heightFt}' ${draft.heightIn}"`,
            },
            { label: 'Weight', value: `${draft.weightKg} ${prefs.weight}` },
            { label: 'Phone', value: draft.phone || 'Not provided' },
            { label: 'Email', value: draft.email || 'Not provided' },
          ].map((item) => (
            <YStack key={item.label} minWidth={130} flexBasis="45%" flexGrow={1} gap={2}>
              <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
                {item.label}
              </Muted>
              <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color">
                {item.value}
              </Text>
            </YStack>
          ))}
        </XStack>

        {medical.length > 0 || importantDiet.length > 0 ? (
          <YStack borderTopWidth={1} borderColor="$borderColor" paddingTop="$3" gap="$2">
            {medical.length > 0 ? (
              <Muted>
                Medical:{' '}
                <Text fontFamily="$body" fontWeight="700" fontSize={13} color="$color">
                  {medical.join(' · ')}
                </Text>
              </Muted>
            ) : null}
            {importantDiet.length > 0 ? (
              <Muted>
                Diet:{' '}
                <Text fontFamily="$body" fontWeight="700" fontSize={13} color="$color">
                  {importantDiet.join(' · ')}
                  {draft.dietary.length > importantDiet.length ? ' · more' : ''}
                </Text>
              </Muted>
            ) : null}
          </YStack>
        ) : null}
      </Card>
    </YStack>
  );
};
