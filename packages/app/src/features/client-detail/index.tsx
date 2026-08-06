'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import { downloadBlob } from '@gymos/platform';
import {
  AccentButton,
  Badge,
  Body,
  Card,
  DeltaChip,
  ErrorState,
  GhostButton,
  LoadingState,
  MessageCircle,
  Muted,
  PageHeader,
  PrimaryButton,
  Row,
  SectionTitle,
  ShieldAlert,
  Stat,
  Tabs,
  WeightChart,
  XStack,
  YStack,
} from '@gymos/ui';
import {
  useClientCheckIns,
  useClientDetail,
  useDownloadCredentialsPdf,
  useVitals,
} from '../../api';
import { AppScreen } from '../shell/app-screen';

const hasSignedIntake = (intake: Record<string, string> | null): boolean =>
  typeof intake?.signedAt === 'string' &&
  intake.signedAt.length > 0 &&
  typeof intake.signaturePngBase64 === 'string' &&
  intake.signaturePngBase64.length > 0;

const PLAN_TONE = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  NEEDS_REVIEW: 'danger',
  SUPERSEDED: 'neutral',
  ARCHIVED: 'neutral',
} as const;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'history', label: 'History' },
] as const;

/** Client hub — tabbed overview / plan / history. */
export const ClientDetailScreen = ({ clientId }: { clientId: string }) => {
  const detail = useClientDetail(clientId);
  const vitals = useVitals(clientId);
  const checkIns = useClientCheckIns(clientId);
  const downloadPdf = useDownloadCredentialsPdf(clientId);
  const [tab, setTab] = useState<string>('overview');
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (detail.isPending) {
    return (
      <AppScreen>
        <LoadingState />
      </AppScreen>
    );
  }
  if (detail.isError) {
    return (
      <AppScreen>
        <ErrorState message="Could not load this client." retry={() => void detail.refetch()} />
      </AppScreen>
    );
  }

  const { client, goal, latestWeightKg, goalProgressPct, dietaryProfile, plans } = detail.data;

  const signed = hasSignedIntake(client.intake);
  const weighIns = (vitals.data?.items ?? [])
    .filter((v) => v.weightKg !== null)
    .map((v) => ({ t: Date.parse(v.recordedAt), weightKg: v.weightKg ?? 0 }));

  const severeAllergies = (dietaryProfile?.restrictions ?? []).filter(
    (r) => r.type === 'ALLERGY_SEVERE',
  );
  const currentPlan =
    plans.find((p) => p.status === 'NEEDS_REVIEW') ??
    plans.find((p) => p.status === 'DRAFT') ??
    plans.find((p) => p.status === 'PUBLISHED');
  const weeklyDelta =
    weighIns.length >= 2 ? (weighIns[0]?.weightKg ?? 0) - (weighIns[1]?.weightKg ?? 0) : 0;

  const onDownloadPdf = () => {
    setPdfError(null);
    downloadPdf.mutate(undefined, {
      onSuccess: (blob) => {
        const safe = client.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40);
        downloadBlob(blob, `client-${safe || 'credentials'}-credentials.pdf`);
      },
      onError: (e) => setPdfError(e.message),
    });
  };

  return (
    <AppScreen>
      <PageHeader
        title={client.name}
        subtitle={[
          client.sex === 'M' ? 'Male' : 'Female',
          client.heightCm !== null ? `${client.heightCm} cm` : null,
          latestWeightKg !== null ? `${latestWeightKg} kg` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          client.phone ? (
            <Link href={`https://wa.me/${client.phone.replace(/[^\d]/g, '')}`} target="_blank">
              <GhostButton
                icon={<MessageCircle size={18} />}
                aria-label="Open WhatsApp"
                minWidth={48}
              >
                Chat
              </GhostButton>
            </Link>
          ) : null
        }
      />

      {severeAllergies.length > 0 ? (
        <Card tone="danger" gap="$3">
          <Row>
            <XStack alignItems="center" gap="$2">
              <ShieldAlert size={18} color="$danger" />
              <Body fontWeight="800" color="$danger">
                Severe allergies
              </Body>
            </XStack>
            <Link href={`/clients/${clientId}/dietary`}>
              <Muted textDecorationLine="underline">Edit</Muted>
            </Link>
          </Row>
          <XStack gap="$2" flexWrap="wrap">
            {severeAllergies.map((r) => (
              <Badge key={r.code} tone="danger" label={r.code.replace('allergen:', '')} />
            ))}
          </XStack>
        </Card>
      ) : null}

      <Tabs items={[...TABS]} value={tab} onChange={setTab} ariaLabel="Client sections" />

      {tab === 'overview' ? (
        <YStack gap="$4">
          {!signed ? (
            <Card tone="accent" gap="$2">
              <Body fontWeight="800">Onboarding incomplete</Body>
              <Muted>
                This client has no e-signed credentials yet. New clients should finish the
                onboarding wizard so a PDF can be generated.
              </Muted>
            </Card>
          ) : (
            <Card gap="$3">
              <Row>
                <YStack flex={1} gap="$1">
                  <Body fontWeight="800">Client Profile</Body>
                  <Muted>
                    Signed {client.intake?.signedAt ? client.intake.signedAt.slice(0, 10) : '—'}
                  </Muted>
                </YStack>
                <PrimaryButton
                  onPress={onDownloadPdf}
                  disabled={downloadPdf.isPending}
                  minWidth={140}
                >
                  {downloadPdf.isPending ? 'Preparing…' : 'Download PDF'}
                </PrimaryButton>
              </Row>
              {pdfError ? (
                <Body color="$danger" role="alert">
                  {pdfError}
                </Body>
              ) : null}
            </Card>
          )}

          <XStack gap="$2" flexWrap="wrap">
            <Stat
              label="Weight"
              value={latestWeightKg !== null ? `${latestWeightKg}` : '—'}
              hint="kg"
            />
            <Stat
              label="Progress"
              value={goalProgressPct !== null ? `${goalProgressPct}%` : '—'}
              hint={goal ? goal.preset : 'No goal'}
            />
            <Stat
              label="Plan"
              value={currentPlan ? `v${currentPlan.version}` : '—'}
              hint={currentPlan?.status ?? 'None'}
            />
          </XStack>

          <Card gap="$3">
            <Row>
              <SectionTitle marginTop={0}>Trend</SectionTitle>
              {goal && weighIns.length >= 2 ? (
                <DeltaChip
                  delta={weeklyDelta}
                  goodDirection={goal.preset === 'GAIN' ? 'up' : 'down'}
                  unit="kg"
                />
              ) : null}
            </Row>
            <WeightChart points={weighIns} goalWeightKg={goal?.targetWeightKg ?? null} />
            {goalProgressPct !== null ? (
              <YStack gap="$1">
                <Row>
                  <Muted>Progress to target</Muted>
                  <Muted>{goalProgressPct}%</Muted>
                </Row>
                <YStack
                  height={10}
                  backgroundColor="$elevatedBg"
                  borderRadius={999}
                  overflow="hidden"
                  accessibilityRole="progressbar"
                  aria-valuenow={goalProgressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <YStack
                    height="100%"
                    width={`${Math.min(100, goalProgressPct)}%`}
                    backgroundColor="$primary"
                  />
                </YStack>
              </YStack>
            ) : null}
          </Card>

          <XStack gap="$2">
            <Link href={`/clients/${clientId}/vitals/new`} style={{ flex: 1 }}>
              <PrimaryButton width="100%">Log vitals</PrimaryButton>
            </Link>
            <Link href={`/clients/${clientId}/check-in`} style={{ flex: 1 }}>
              <AccentButton width="100%">Check-in</AccentButton>
            </Link>
          </XStack>
        </YStack>
      ) : null}

      {tab === 'plan' ? (
        <YStack gap="$4">
          {goal === null ? (
            <Card gap="$3">
              <Body>Set a goal first — targets and plans are computed from it.</Body>
              <Link href={`/clients/${clientId}/goal/new`}>
                <PrimaryButton>Set a goal</PrimaryButton>
              </Link>
            </Card>
          ) : currentPlan === undefined ? (
            <Card gap="$3">
              <Body>No plan yet. Generate a 7-day plan from the goal targets.</Body>
              <Link href={`/clients/${clientId}/plan`}>
                <PrimaryButton>Generate plan</PrimaryButton>
              </Link>
            </Card>
          ) : (
            <Link href={`/clients/${clientId}/plan`}>
              <Card interactive gap="$2">
                <Row>
                  <Body fontWeight="800">
                    v{currentPlan.version} · {currentPlan.targets.kcal} kcal
                  </Body>
                  <Badge tone={PLAN_TONE[currentPlan.status]} label={currentPlan.status} />
                </Row>
                <Muted>
                  P {currentPlan.targets.proteinG}g · F {currentPlan.targets.fatG}g · C{' '}
                  {currentPlan.targets.carbsG}g · fiber {currentPlan.targets.fiberG}g
                </Muted>
                {currentPlan.status === 'NEEDS_REVIEW' ? (
                  <Body color="$danger" fontWeight="700">
                    Dietary profile changed — plan blocked pending your review.
                  </Body>
                ) : null}
              </Card>
            </Link>
          )}

          <SectionTitle>Dietary profile</SectionTitle>
          <Link href={`/clients/${clientId}/dietary`}>
            <Card interactive>
              {dietaryProfile === null || dietaryProfile.restrictions.length === 0 ? (
                <Body>No restrictions recorded — tap to add.</Body>
              ) : (
                <XStack gap="$2" flexWrap="wrap">
                  {dietaryProfile.restrictions.map((r) => (
                    <Badge
                      key={`${r.type}:${r.code}`}
                      tone={r.type === 'ALLERGY_SEVERE' ? 'danger' : 'neutral'}
                      label={r.code.split(':')[1] ?? r.code}
                    />
                  ))}
                </XStack>
              )}
            </Card>
          </Link>

          {goal === null ? null : (
            <Link href={`/clients/${clientId}/goal/new`}>
              <GhostButton width="100%">Update goal</GhostButton>
            </Link>
          )}
        </YStack>
      ) : null}

      {tab === 'history' ? (
        <YStack gap="$3">
          {checkIns.isPending ? (
            <LoadingState />
          ) : checkIns.isError ? (
            <ErrorState message="Could not load check-ins." retry={() => void checkIns.refetch()} />
          ) : checkIns.data.items.length === 0 ? (
            <Muted>No check-ins yet.</Muted>
          ) : (
            checkIns.data.items.map((checkIn) => {
              const href =
                checkIn.status === 'DUE'
                  ? `/clients/${clientId}/check-in`
                  : `/clients/${clientId}/check-ins/${checkIn.id}`;
              return (
                <Link key={checkIn.id} href={href}>
                  <Card interactive gap="$1">
                    <Row>
                      <Body fontWeight="700">{checkIn.scheduledFor}</Body>
                      <Badge
                        tone={
                          checkIn.status === 'DUE'
                            ? 'warning'
                            : checkIn.engineOutput?.type === 'REFER_REVIEW'
                              ? 'danger'
                              : 'neutral'
                        }
                        label={
                          checkIn.status === 'COMPLETED'
                            ? (checkIn.engineOutput?.type ?? 'DONE')
                            : checkIn.status
                        }
                      />
                    </Row>
                    {checkIn.adherenceRating !== null ? (
                      <Muted>Adherence {checkIn.adherenceRating}/5</Muted>
                    ) : null}
                  </Card>
                </Link>
              );
            })
          )}
        </YStack>
      ) : null}
    </AppScreen>
  );
};
