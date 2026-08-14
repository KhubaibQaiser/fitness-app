'use client';

import { useSyncExternalStore } from 'react';
import {
  getServerSessionPresenceSnapshot,
  getSessionPresence,
  subscribeSessionPresence,
} from './session-presence';

export const useSessionPresence = (): boolean =>
  useSyncExternalStore(
    subscribeSessionPresence,
    getSessionPresence,
    getServerSessionPresenceSnapshot,
  );
