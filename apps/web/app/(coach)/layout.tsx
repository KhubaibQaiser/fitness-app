'use client';

import { type ReactNode } from 'react';
import { GateGuard } from '@gymos/app/features/shell/gate-guard';
import { TabBar } from '@gymos/app/features/shell/tab-bar';

const CoachLayout = ({ children }: { children: ReactNode }) => (
  <GateGuard>
    {children}
    <TabBar />
  </GateGuard>
);

export default CoachLayout;
