import { Slot, usePathname } from 'expo-router';
import { AppShell } from '@gymos/app/features/shell/app-shell';
import { GateGuard } from '@gymos/app/features/shell/gate-guard';
import { PathnameProvider } from '@gymos/platform';

export default function CoachLayout() {
  // Solito's pathname resolves to this layout's own route, so shared chrome reads Expo Router's.
  const pathname = usePathname();
  return (
    <PathnameProvider pathname={pathname}>
      <GateGuard>
        <AppShell>
          <Slot />
        </AppShell>
      </GateGuard>
    </PathnameProvider>
  );
}
