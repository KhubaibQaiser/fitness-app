'use client';

import { use } from 'react';
import { CheckInDetailScreen } from '@gymos/app/features/check-in/detail';

const Page = ({ params }: { params: Promise<{ clientId: string; checkInId: string }> }) => {
  const { clientId, checkInId } = use(params);
  return <CheckInDetailScreen clientId={clientId} checkInId={checkInId} />;
};
export default Page;
