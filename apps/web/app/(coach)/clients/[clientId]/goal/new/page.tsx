'use client';

import { use } from 'react';
import { GoalFormScreen } from '@gymos/app/features/goal-form';

const Page = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  return <GoalFormScreen clientId={clientId} />;
};
export default Page;
