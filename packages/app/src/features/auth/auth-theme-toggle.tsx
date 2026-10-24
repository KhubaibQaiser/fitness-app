'use client';

import { useThemeMode } from '@gymos/platform';
import { IconButton, Moon, Sun } from '@gymos/ui';

export const AuthThemeToggle = () => {
  const { mode, toggle } = useThemeMode();
  const dark = mode === 'dark';

  return (
    <IconButton
      tone="ghost"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onPress={toggle}
      icon={dark ? <Sun size={18} color="$color" /> : <Moon size={18} color="$color" />}
    />
  );
};
