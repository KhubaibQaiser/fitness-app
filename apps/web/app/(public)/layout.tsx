'use client';

import type { ReactNode } from 'react';
import { AuthSplitLayout } from '@gymos/app/features/auth/auth-split-layout';

const PublicLayout = ({ children }: { children: ReactNode }) => (
  <AuthSplitLayout>{children}</AuthSplitLayout>
);

export default PublicLayout;
