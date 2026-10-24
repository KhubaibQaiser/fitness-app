import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'solito/navigation';

type AuthDirection = 'forward' | 'back';

const PUBLIC_PATHS = new Set(['/login', '/signup', '/forgot-password']);
const SLIDE_MS = 400;

const slideClass = (direction: AuthDirection, phase: 'enter' | 'exit'): string =>
  `gymos-auth-${phase}-${direction}`;

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rememberPath = (stack: string[], nextPath: string): AuthDirection => {
  const back = stack.at(-2) === nextPath;
  if (stack.at(-1) !== nextPath) {
    if (back) stack.pop();
    else stack.push(nextPath);
  }
  return back ? 'back' : 'forward';
};

/** Snapshot the current form so it can slide out while the next route paints. */
const parkExit = (panel: HTMLElement, direction: AuthDirection): void => {
  const copy = panel.cloneNode(true);
  if (!(copy instanceof HTMLElement)) return;
  const rect = panel.getBoundingClientRect();
  const clip = document.createElement('div');
  copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  copy.classList.remove(
    'gymos-auth-enter-forward',
    'gymos-auth-enter-back',
    'gymos-auth-exit-forward',
    'gymos-auth-exit-back',
  );
  copy.classList.add(slideClass(direction, 'exit'));
  copy.style.position = 'absolute';
  copy.style.inset = '0';
  clip.style.position = 'fixed';
  clip.style.top = `${rect.top}px`;
  clip.style.left = `${rect.left}px`;
  clip.style.width = `${rect.width}px`;
  clip.style.height = `${rect.height}px`;
  clip.style.overflow = 'hidden';
  clip.style.pointerEvents = 'none';
  clip.style.zIndex = '5';
  clip.appendChild(copy);
  document.body.appendChild(clip);
  const remove = () => clip.remove();
  copy.addEventListener('animationend', remove, { once: true });
  window.setTimeout(remove, SLIDE_MS);
};

const isPlainLeftClick = (event: MouseEvent, anchor: HTMLAnchorElement): boolean =>
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey &&
  anchor.target !== '_blank';

export const useAuthPanelSlide = () => {
  const pathname = usePathname() ?? '/';
  const history = useRef<string[]>([pathname]);
  const panelRef = useRef<HTMLElement | null>(null);
  const pendingDirection = useRef<AuthDirection | null>(null);
  const [enterClass, setEnterClass] = useState<string | undefined>(undefined);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || prefersReducedMotion()) return;
      const anchor = event.target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement) || !isPlainLeftClick(event, anchor)) return;
      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      const nextPath = nextUrl.pathname;
      if (!PUBLIC_PATHS.has(nextPath) || nextPath === window.location.pathname) return;
      const panel = panelRef.current;
      if (!panel) return;
      const direction = rememberPath(history.current, nextPath);
      parkExit(panel, direction);
      pendingDirection.current = direction;
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useLayoutEffect(() => {
    const direction = pendingDirection.current;
    if (direction === null) return;
    pendingDirection.current = null;
    setEnterClass(slideClass(direction, 'enter'));
  }, [pathname]);

  useEffect(() => {
    if (enterClass === undefined) return;
    const node = panelRef.current;
    const clear = () => setEnterClass(undefined);
    node?.addEventListener('animationend', clear, { once: true });
    const timer = window.setTimeout(clear, SLIDE_MS);
    return () => {
      node?.removeEventListener('animationend', clear);
      window.clearTimeout(timer);
    };
  }, [enterClass]);

  const setPanel = (node: unknown) => {
    panelRef.current = node instanceof HTMLElement ? node : null;
  };

  return { enterClass, pathname, setPanel };
};
