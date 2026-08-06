'use client';

import { use } from 'react';
import { DietaryScreen } from '@gymos/app/features/dietary';

const Page = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  return <DietaryScreen clientId={clientId} />;
};
export default Page;
