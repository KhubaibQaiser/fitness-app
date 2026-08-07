'use client';

import { Link } from 'solito/link';
import type { CheckIn } from '@gymos/contracts';
import { Badge, Card, ErrorState, LoadingState, Muted, Text, XStack, YStack } from '@gymos/ui';
import { adherenceRatingToPct } from '../check-in/adherence';

type Props = {
  clientId: string;
  isPending: boolean;
  isError: boolean;
  items: CheckIn[];
  onRetry: () => void;
};

/** History tab — check-in list with adherence % and optional weight. */
export const ClientHubHistory = ({ clientId, isPending, isError, items, onRetry }: Props) => {
  if (isPending) return <LoadingState />;
  if (isError) {
    return <ErrorState message="Could not load check-ins." retry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <YStack paddingVertical="$8" alignItems="center">
        <Muted>No check-ins logged yet.</Muted>
      </YStack>
    );
  }

  return (
    <YStack gap="$2.5">
      {items.map((checkIn) => {
        const href =
          checkIn.status === 'DUE'
            ? `/clients/${clientId}/check-in`
            : `/clients/${clientId}/check-ins/${checkIn.id}`;
        const adherencePct =
          checkIn.adherenceRating !== null
            ? adherenceRatingToPct(checkIn.adherenceRating as 1 | 2 | 3 | 4 | 5)
            : null;
        const weightKg = checkIn.weightKg;

        return (
          <Link key={checkIn.id} href={href}>
            <Card interactive gap="$2" padding="$4">
              <XStack flexWrap="wrap" alignItems="center" gap="$2">
                <Text fontFamily="$heading" fontWeight="700" fontSize={13.5} color="$color">
                  {checkIn.scheduledFor}
                </Text>
                <Badge
                  tone={
                    checkIn.status === 'DUE'
                      ? 'warning'
                      : checkIn.engineOutput?.type === 'REFER_REVIEW'
                        ? 'danger'
                        : checkIn.engineOutput?.type === 'HOLD'
                          ? 'success'
                          : 'neutral'
                  }
                  label={
                    checkIn.status === 'COMPLETED'
                      ? (checkIn.engineOutput?.type ?? 'DONE')
                      : checkIn.status
                  }
                />
              </XStack>

              <XStack flexWrap="wrap" gap="$4">
                {typeof weightKg === 'number' ? (
                  <Muted fontSize={12.5}>
                    Weight:{' '}
                    <Text fontFamily="$mono" fontWeight="700" fontSize={12.5} color="$color">
                      {weightKg} kg
                    </Text>
                  </Muted>
                ) : null}
                {adherencePct !== null ? (
                  <Muted fontSize={12.5}>
                    Adherence:{' '}
                    <Text fontFamily="$heading" fontWeight="700" fontSize={12.5} color="$color">
                      ~{adherencePct}%
                    </Text>
                  </Muted>
                ) : null}
              </XStack>

              {checkIn.coachNotes ? (
                <Muted fontSize={12} fontStyle="italic" numberOfLines={3}>
                  “{checkIn.coachNotes}”
                </Muted>
              ) : null}
            </Card>
          </Link>
        );
      })}
    </YStack>
  );
};
