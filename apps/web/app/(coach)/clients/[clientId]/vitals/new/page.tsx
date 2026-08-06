'use client';

import { use } from 'react';
import { VitalsEntryScreen } from '@gymos/app/features/vitals-entry';

const Page = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  return <VitalsEntryScreen clientId={clientId} />;
};
export default Page;
