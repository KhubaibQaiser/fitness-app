'use client';

import { useRouter } from 'solito/navigation';
import { type ClientIntake } from '@gymos/contracts';
import { downloadBlob } from '@gymos/platform';
import { ErrorState } from '@gymos/ui';
import {
  useClientCheckIns,
  useClientDetail,
  useDownloadCredentialsPdf,
  useVitals,
} from '../../api';
import { AppScreen } from '../shell/app-screen';
import { ScreenBody } from '../shell/screen-body';
import { ClientHubHeader } from './client-hub-header';
import { ClientHubHistory } from './client-hub-history';
import { ClientHubJourney } from './client-hub-journey';
import { ClientHubOverview } from './client-hub-overview';
import { ClientHubPlan } from './client-hub-plan';
import { ClientHubSkeleton } from './client-hub-skeleton';
import { clientHubPath, isClientHubTabId, type ClientHubTabId } from './client-hub-tabs';

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

/** Client hub — kit layout with overview / journey / plan / history tabs. */
export const ClientDetailScreen = ({
  clientId,
  tab,
}: {
  clientId: string;
  tab: ClientHubTabId;
}) => {
  const router = useRouter();
  const detail = useClientDetail(clientId);
  const vitals = useVitals(clientId);
  const checkIns = useClientCheckIns(clientId);
  const downloadPdf = useDownloadCredentialsPdf(clientId);
  const onTabChange = (id: string) => {
    if (!isClientHubTabId(id) || id === tab) return;
    router.replace(clientHubPath(clientId, id));
  };

  if (detail.isPending) {
    return (
      <AppScreen gap="$0" paddingTop={0} paddingHorizontal={0} flush>
        <ClientHubSkeleton clientId={clientId} tab={tab} onTabChange={onTabChange} />
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
    <AppScreen gap="$0" paddingTop={0} paddingHorizontal={0} flush>
      <ClientHubHeader
        clientId={clientId}
        name={client.name}
        phone={client.phone}
        email={client.email}
        status={status}
        tab={tab}
        onTabChange={onTabChange}
        signed={signed}
        pdfPending={downloadPdf.isPending}
        onDownloadPdf={onDownloadPdf}
      />

      <ScreenBody gap="$4">
        {tab === 'overview' ? (
          <ClientHubOverview
            client={client}
            goal={goal}
            latestWeightKg={latestWeightKg}
            goalProgressPct={goalProgressPct}
            dietaryProfile={dietaryProfile}
            signed={signed}
            vitals={vitals.data?.items ?? []}
            vitalsPending={vitals.isPending}
          />
        ) : null}

        {tab === 'journey' ? (
          <ClientHubJourney
            clientId={clientId}
            client={client}
            goal={goal}
            latestWeightKg={latestWeightKg}
            vitals={vitals.data?.items ?? []}
            checkIns={checkIns.data?.items ?? []}
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
    </AppScreen>
  );
};
