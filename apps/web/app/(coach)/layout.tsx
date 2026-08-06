'use client';

import { type ReactNode } from 'react';
import { AppShell } from '@gymos/app/features/shell/app-shell';
import { GateGuard } from '@gymos/app/features/shell/gate-guard';
import { AppErrorBoundary } from '@gymos/ui';

const CoachLayout = ({ children }: { children: ReactNode }) => (
  <GateGuard>
    <AppErrorBoundary>
      <AppShell>{children}</AppShell>
    </AppErrorBoundary>
  </GateGuard>
);

export default CoachLayout;
