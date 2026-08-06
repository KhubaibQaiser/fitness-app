'use client';

import { use } from 'react';
import { CheckInScreen } from '@gymos/app/features/check-in';

const Page = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  return <CheckInScreen clientId={clientId} />;
};
export default Page;
