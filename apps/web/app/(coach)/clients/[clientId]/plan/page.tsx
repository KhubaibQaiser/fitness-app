'use client';

import { use } from 'react';
import { PlanScreen } from '@gymos/app/features/plan';

const Page = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  return <PlanScreen clientId={clientId} />;
};
export default Page;
