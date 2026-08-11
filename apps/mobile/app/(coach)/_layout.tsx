import { Slot } from 'expo-router';
import { AppShell } from '@gymos/app/features/shell/app-shell';
import { GateGuard } from '@gymos/app/features/shell/gate-guard';

export default function CoachLayout() {
  return (
    <GateGuard>
      <AppShell>
        <Slot />
      </AppShell>
    </GateGuard>
  );
}
