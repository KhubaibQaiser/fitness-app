export const CLIENT_HUB_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'journey', label: 'Journey' },
  { id: 'plan', label: 'Meal Plan' },
  { id: 'history', label: 'History' },
] as const;

export type ClientHubTabId = (typeof CLIENT_HUB_TABS)[number]['id'];

export const isClientHubTabId = (value: string): value is ClientHubTabId =>
  CLIENT_HUB_TABS.some((tab) => tab.id === value);
