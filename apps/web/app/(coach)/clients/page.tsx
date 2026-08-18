import { HydrationBoundary } from '@tanstack/react-query';
import { RosterScreen } from '@gymos/app/features/roster';
import { dehydrateCoachQueries } from '../../../lib/prefetch-coach';
import { requestCookieHeader } from '../../../lib/request-cookies';

const Page = async () => {
  const cookieHeader = await requestCookieHeader();
  const state = await dehydrateCoachQueries({ cookieHeader, include: ['clients'] });

  return (
    <HydrationBoundary state={state}>
      <RosterScreen />
    </HydrationBoundary>
  );
};

export default Page;
