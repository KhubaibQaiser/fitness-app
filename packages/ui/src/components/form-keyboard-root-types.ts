import type { ReactNode } from 'react';

export type FormKeyboardRootProps = {
  children: ReactNode;
  /** Stretch to fill a screen column. Auth screens need this so iOS KAV has a height. */
  fill?: boolean;
  /** iOS KeyboardAvoidingView. Ignored on web. */
  avoidKeyboard?: boolean;
  /** Web `<form>` landmark only. Never implied by avoidKeyboard. */
  asForm?: boolean;
};
