import { enterKeyHintForReturnKey, type EnterKeyHint, type ReturnKeyType } from './keyboard-map';

export type ChainActionKind = 'next' | 'submit' | 'dismiss' | 'newline';

export type ResolvedChainAction = {
  returnKeyType: ReturnKeyType;
  enterKeyHint: EnterKeyHint;
  blurOnSubmit: boolean;
  kind: ChainActionKind;
  nextName: string | null;
  prevName: string | null;
};

export type ResolveChainActionOptions = {
  multiline: ReadonlySet<string>;
  hasSubmit: boolean;
  submitKey: 'go' | 'done';
};

/**
 * Named-field keyboard policy. Order is the `names` array, never mount order —
 * remounts, Strict Mode, and conditional height (cm vs ft/in) stay correct.
 */
export const resolveChainAction = (
  names: readonly string[],
  name: string,
  options: ResolveChainActionOptions,
): ResolvedChainAction => {
  const index = names.indexOf(name);
  const prevName = index > 0 ? (names[index - 1] ?? null) : null;
  const nextName = index >= 0 && index < names.length - 1 ? (names[index + 1] ?? null) : null;
  const unknown = index < 0;

  if (unknown || options.multiline.has(name)) {
    return {
      returnKeyType: 'default',
      enterKeyHint: 'enter',
      blurOnSubmit: false,
      kind: 'newline',
      nextName,
      prevName,
    };
  }

  if (nextName !== null) {
    return {
      returnKeyType: 'next',
      enterKeyHint: 'next',
      blurOnSubmit: false,
      kind: 'next',
      nextName,
      prevName,
    };
  }

  if (options.hasSubmit) {
    return {
      returnKeyType: options.submitKey,
      enterKeyHint: enterKeyHintForReturnKey(options.submitKey),
      blurOnSubmit: true,
      kind: 'submit',
      nextName: null,
      prevName,
    };
  }

  return {
    returnKeyType: 'done',
    enterKeyHint: 'done',
    blurOnSubmit: true,
    kind: 'dismiss',
    nextName: null,
    prevName,
  };
};
