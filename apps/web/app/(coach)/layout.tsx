import { HydrationBoundary } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { dehydrateCoachQueries } from '../../lib/prefetch-coach';
import { requestCookieHeader } from '../../lib/request-cookies';
import { CoachShell } from './coach-shell';

const CoachLayout = async ({ children }: { children: ReactNode }) => {
  const cookieHeader = await requestCookieHeader();
  const state = await dehydrateCoachQueries({ cookieHeader, include: ['me', 'unread'] });

  return (
    <HydrationBoundary state={state}>
      <CoachShell>{children}</CoachShell>
    </HydrationBoundary>
  );
};

export default CoachLayout;
