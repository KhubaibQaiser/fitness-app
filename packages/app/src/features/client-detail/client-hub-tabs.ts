export const CLIENT_HUB_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'journey', label: 'Journey' },
  { id: 'plan', label: 'Meal Plan' },
  { id: 'history', label: 'History' },
] as const;

export type ClientHubTabId = (typeof CLIENT_HUB_TABS)[number]['id'];

const HUB_TAB_SEGMENT: Record<ClientHubTabId, string | null> = {
  overview: null,
  journey: 'journey',
  plan: 'meal-plan',
  history: 'history',
};

export const isClientHubTabId = (value: string): value is ClientHubTabId =>
  CLIENT_HUB_TABS.some((tab) => tab.id === value);

export const clientHubPath = (clientId: string, tab: ClientHubTabId): string => {
  const segment = HUB_TAB_SEGMENT[tab];
  return segment === null ? `/clients/${clientId}` : `/clients/${clientId}/${segment}`;
};

export const clientHubTabFromSegment = (segment: string | undefined): ClientHubTabId | null => {
  if (segment === undefined || segment.length === 0) return 'overview';
  for (const tab of CLIENT_HUB_TABS) {
    if (HUB_TAB_SEGMENT[tab.id] === segment) return tab.id;
  }
  return null;
};

/** Hub overview + tab routes. Excludes `/clients/new` and editor subflows such as `/plan`. */
export const isClientHubPath = (pathname: string): boolean => {
  if (pathname === '/clients/new' || pathname.startsWith('/clients/new/')) return false;
  return /^\/clients\/[^/]+(?:\/(?:journey|meal-plan|history))?$/.test(pathname);
};
