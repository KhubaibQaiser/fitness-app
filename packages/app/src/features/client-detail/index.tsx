'use client';

import { useState } from 'react';
import { type ClientIntake } from '@gymos/contracts';
import { downloadBlob } from '@gymos/platform';
import { ErrorState, LoadingState } from '@gymos/ui';
import {
  useClientCheckIns,
  useClientDetail,
  useDownloadCredentialsPdf,
  useVitals,
} from '../../api';
import { AppScreen } from '../shell/app-screen';
import { ScreenBody } from '../shell/screen-body';
import { useAppChrome } from '../shell/use-app-chrome';
import { ClientHubHeader } from './client-hub-header';
import { ClientHubHistory } from './client-hub-history';
import { ClientHubMobileCtas } from './client-hub-mobile-ctas';
import { ClientHubOverview } from './client-hub-overview';
import { ClientHubPlan } from './client-hub-plan';

const hasSignedIntake = (intake: ClientIntake | null): boolean =>
  typeof intake?.signedAt === 'string' &&
  intake.signedAt.length > 0 &&
  typeof intake.signaturePngBase64 === 'string' &&
  intake.signaturePngBase64.length > 0;

type HubStatus = 'attention' | 'on-track' | 'new';

const resolveHubStatus = ({
  signed,
  hasMedical,
  hasSevereAllergy,
  planNeedsReview,
  hasReferReview,
}: {
  signed: boolean;
  hasMedical: boolean;
  hasSevereAllergy: boolean;
  planNeedsReview: boolean;
  hasReferReview: boolean;
}): HubStatus => {
  if (!signed) return 'new';
  if (hasMedical || hasSevereAllergy || planNeedsReview || hasReferReview) return 'attention';
  return 'on-track';
};

/** Client hub — kit layout with overview / plan / history tabs. */
export const ClientDetailScreen = ({ clientId }: { clientId: string }) => {
  const detail = useClientDetail(clientId);
  const vitals = useVitals(clientId);
  const checkIns = useClientCheckIns(clientId);
  const downloadPdf = useDownloadCredentialsPdf(clientId);
  const { isDesktop, showMobileTabBar } = useAppChrome();
  const [tab, setTab] = useState<string>('overview');

  const showMobileCtas = !isDesktop && showMobileTabBar;

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

  const { client, goal, latestWeightKg, goalProgressPct, dietaryProfile, plans, recentCheckIns } =
    detail.data;

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

  const medicalParts = [
    client.medicalFlags?.pregnant === true ? 'Pregnant' : null,
    client.medicalFlags?.physicianClearanceRequired === true ? 'clearance' : null,
    ...(client.medicalFlags?.conditions ?? []),
  ].filter(Boolean);

  const status = resolveHubStatus({
    signed,
    hasMedical: medicalParts.length > 0,
    hasSevereAllergy: severeAllergies.length > 0,
    planNeedsReview: currentPlan?.status === 'NEEDS_REVIEW',
    hasReferReview: recentCheckIns.some((c) => c.engineOutput?.type === 'REFER_REVIEW'),
  });

  const onDownloadPdf = () => {
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
    });
  };

  return (
    <AppScreen gap="$0" paddingTop={0} paddingHorizontal={0}>
      <ClientHubHeader
        clientId={clientId}
        name={client.name}
        phone={client.phone}
        email={client.email}
        status={status}
        tab={tab}
        onTabChange={setTab}
        signed={signed}
        pdfPending={downloadPdf.isPending}
        onDownloadPdf={onDownloadPdf}
      />

      <ScreenBody gap="$4">
        {tab === 'overview' ? (
          <ClientHubOverview
            clientId={clientId}
            client={client}
            goal={goal}
            latestWeightKg={latestWeightKg}
            goalProgressPct={goalProgressPct}
            dietaryProfile={dietaryProfile}
            weighIns={weighIns}
            signed={signed}
          />
        ) : null}

        {tab === 'plan' ? (
          <ClientHubPlan
            clientId={clientId}
            client={client}
            goal={goal}
            latestWeightKg={latestWeightKg}
            dietaryProfile={dietaryProfile}
            currentPlan={currentPlan}
          />
        ) : null}

        {tab === 'history' ? (
          <ClientHubHistory
            clientId={clientId}
            isPending={checkIns.isPending}
            isError={checkIns.isError}
            items={checkIns.data?.items ?? []}
            onRetry={() => void checkIns.refetch()}
          />
        ) : null}
      </ScreenBody>

      <ClientHubMobileCtas clientId={clientId} visible={showMobileCtas} />
    </AppScreen>
  );
};
