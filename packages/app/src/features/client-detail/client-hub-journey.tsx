'use client';

import { Link } from 'solito/link';
import type { CheckIn, Client, Goal, Vitals } from '@gymos/contracts';
import { PrimaryButton } from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';
import { unitPrefsFrom } from '../../lib/unit-prefs';
import { buildLiveJourney } from '../client-journey/client-journey';
import { ClientJourneyMap } from '../client-journey/client-journey-map';

type Props = {
  clientId: string;
  client: Client;
  goal: Goal | null;
  latestWeightKg: number | null;
  vitals: Vitals[];
  checkIns: CheckIn[];
};

/** Journey tab — live check-in path, current position, and projected goal. */
export const ClientHubJourney = ({
  clientId,
  client,
  goal,
  latestWeightKg,
  vitals,
  checkIns,
}: Props) => {
  const me = useMe();
  const config = usePublicConfig();
  const prefs = unitPrefsFrom(me.data, config.data);
  const nodes =
    goal !== null
      ? buildLiveJourney({
          clientId: client.id,
          goal,
          checkIns,
          vitals,
          latestWeightKg,
        })
      : [];

  return (
    <ClientJourneyMap
      nodes={nodes}
      weightUnit={prefs.weight}
      chrome="page"
      subtitle="Check-in performance, today’s position and the projected path to the goal."
      emptyAction={
        goal === null ? (
          <Link href={`/clients/${clientId}/goal/new`}>
            <PrimaryButton>Set a goal</PrimaryButton>
          </Link>
        ) : undefined
      }
    />
  );
};
