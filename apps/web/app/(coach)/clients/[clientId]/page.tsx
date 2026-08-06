'use client';

import { use } from 'react';
import { ClientDetailScreen } from '@gymos/app/features/client-detail';

const Page = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  return <ClientDetailScreen clientId={clientId} />;
};
export default Page;
