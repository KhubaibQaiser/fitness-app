'use client';

import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard } from 'react-native';
import { resolveChainAction } from './focus-chain';
import type { FormFieldHandle } from './form-field-handle';
import type { EnterKeyHint, ReturnKeyType } from './keyboard-map';
import { KeyboardToolbar } from './keyboard-toolbar';

export type FocusChainBind = {
  ref: (instance: FormFieldHandle | null) => void;
  returnKeyType: ReturnKeyType;
  enterKeyHint: EnterKeyHint;
  blurOnSubmit: boolean;
  onSubmitEditing: () => void;
  onFocus: () => void;
  inputAccessoryViewID: string;
};

export type UseFocusChainOptions = {
  onSubmit?: () => void;
  /** Auth flows use Go; capture flows use Done. */
  submitKey?: 'go' | 'done';
  multiline?: readonly string[];
};

const nativeIdFromReactId = (reactId: string): string =>
  `gfc${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

export const useFocusChain = (
  names: readonly string[],
  options: UseFocusChainOptions = {},
): { bind: (name: string) => FocusChainBind; toolbar: ReactNode } => {
  const submitKey = options.submitKey ?? 'done';
  const multilineKey = (options.multiline ?? []).join('\0');
  const multiline = useMemo(() => new Set(options.multiline ?? []), [multilineKey]);
  const accessoryId = nativeIdFromReactId(useId());
  const refs = useRef(new Map<string, FormFieldHandle | null>());
  const namesRef = useRef(names);
  namesRef.current = names;
  const onSubmitRef = useRef(options.onSubmit);
  onSubmitRef.current = options.onSubmit;
  const [activeName, setActiveName] = useState<string | null>(null);

  const resolve = useCallback(
    (name: string) =>
      resolveChainAction(namesRef.current, name, {
        multiline,
        hasSubmit: onSubmitRef.current !== undefined,
        submitKey,
      }),
    [multiline, submitKey],
  );

  const focusName = useCallback((name: string) => {
    const node = refs.current.get(name);
    requestAnimationFrame(() => {
      node?.focus();
    });
  }, []);

  const runAction = useCallback(
    (name: string) => {
      const action = resolve(name);
      if (action.kind === 'next' && action.nextName !== null) {
        focusName(action.nextName);
        return;
      }
      if (action.kind === 'submit') {
        onSubmitRef.current?.();
        return;
      }
      if (action.kind === 'dismiss') {
        Keyboard.dismiss();
      }
    },
    [focusName, resolve],
  );

  const bind = useCallback(
    (name: string): FocusChainBind => {
      const action = resolve(name);
      return {
        ref: (instance) => {
          refs.current.set(name, instance);
        },
        returnKeyType: action.returnKeyType,
        enterKeyHint: action.enterKeyHint,
        blurOnSubmit: action.blurOnSubmit,
        onSubmitEditing: () => runAction(name),
        onFocus: () => setActiveName(name),
        inputAccessoryViewID: accessoryId,
      };
    },
    [accessoryId, resolve, runAction],
  );

  const activeAction = activeName !== null ? resolve(activeName) : null;
  const doneLabel = submitKey === 'go' && activeAction?.kind === 'submit' ? 'Go' : 'Done';

  const toolbar = (
    <KeyboardToolbar
      nativeID={accessoryId}
      canPrev={activeAction?.prevName != null}
      canNext={activeAction?.nextName != null}
      doneLabel={doneLabel}
      onPrev={() => {
        if (activeAction?.prevName != null) focusName(activeAction.prevName);
      }}
      onNext={() => {
        if (activeAction?.nextName != null) focusName(activeAction.nextName);
      }}
      onDone={() => {
        if (activeAction?.kind === 'submit') {
          onSubmitRef.current?.();
          return;
        }
        Keyboard.dismiss();
      }}
    />
  );

  return { bind, toolbar };
};
