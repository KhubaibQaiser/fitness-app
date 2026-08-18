export type ThemeMode = 'light' | 'dark';

/** Cookie name. SSR and the blocking first-paint script both read this. */
export const THEME_MODE_KEY = 'gymos.themeMode';

export const parseThemeMode = (value: string | null | undefined): ThemeMode | null =>
  value === 'light' || value === 'dark' ? value : null;

export const resolveThemeMode = ({
  cookie,
  prefersDark,
}: {
  cookie: string | null | undefined;
  prefersDark: boolean;
}): ThemeMode => parseThemeMode(cookie) ?? (prefersDark ? 'dark' : 'light');

/**
 * Runs before hydration. Cookie is canonical; OS preference fills a first visit.
 */
export const themeBootstrapScript = (): string =>
  `(function(){try{var k="${THEME_MODE_KEY}";var mode=null;var m=document.cookie.match(/(?:^|; )gymos\\.themeMode=(light|dark)/);if(m)mode=m[1];if(!mode){mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.dataset.theme=mode;r.style.colorScheme=mode;r.classList.remove("t_light","t_dark");r.classList.add(mode==="dark"?"t_dark":"t_light");document.cookie=k+"="+mode+"; Path=/; Max-Age=31536000; SameSite=Lax"}catch(e){}})();`;

export const applyThemeToDocument = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  root.classList.remove('t_light', 't_dark');
  root.classList.add(mode === 'dark' ? 't_dark' : 't_light');
};

export const persistThemeModeCookie = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_MODE_KEY}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`;
};
