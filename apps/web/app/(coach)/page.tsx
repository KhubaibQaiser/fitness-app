import { HydrationBoundary } from '@tanstack/react-query';
import { HomeScreen } from '@gymos/app/features/home';
import { dehydrateCoachQueries } from '../../lib/prefetch-coach';
import { requestCookieHeader } from '../../lib/request-cookies';

const Page = async () => {
  const cookieHeader = await requestCookieHeader();
  const state = await dehydrateCoachQueries({
    cookieHeader,
    include: ['due', 'clients', 'notifications'],
  });

  return (
    <HydrationBoundary state={state}>
      <HomeScreen />
    </HydrationBoundary>
  );
};

export default Page;
