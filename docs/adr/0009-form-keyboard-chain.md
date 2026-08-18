# ADR-0009: Named focus chain for cross-platform forms

- **Status**: Accepted
- **Date**: 2026-08-18
- **Phase**: P2 (form keyboard UX; not P1 re-skin)

## Context

Shared screens in `@gymos/app` use Tamagui `FormField` (RN `TextInput` / RN-web `<input>`). There is no HTML `<form>` submit path and no `returnKeyType`. Enter-to-submit existed on a few last fields only. iOS `decimal-pad` / `number-pad` / `phone-pad` have **no return key**, so a “Next on the keyboard” plan that only sets `returnKeyType` would fail on vitals, weight, and phone.

Mount-order React context (auto-register fields as they mount) is unsafe here: Strict Mode remounts, height toggles cm vs ft/in, and mapped vitals fields would reorder or duplicate.

## Decision

1. **Named `useFocusChain(names, { onSubmit, submitKey, multiline })`** in `@gymos/ui`. Order is the `names` array, never mount order. Call sites spread `chain.bind(name)` onto `FormField`.
2. **`FormField` maps `inputMode` → native `keyboardType`** and web `enterKeyHint`. Pads attach `inputAccessoryViewID`.
3. **iOS-only `KeyboardToolbar`** (`.ios.tsx`) via `InputAccessoryView` — Previous / Next / Done. Web and Android stay no-op; Android IME + `softwareKeyboardLayoutMode: resize` cover Next/Done.
4. **Enter in the middle of a multi-field form does not submit.** Last single-line field submits (or dismisses when there is no handler). Multiline fields keep newline.
5. **`FormKeyboardRoot`**: web `<form onSubmit={preventDefault}>` only when enabled (actual form screens). Native: iOS `KeyboardAvoidingView` only. Not a new form library; no Tamagui `Form.Trigger` (would fight Next).

## Consequences

**Easier:** One policy function (`resolveChainAction`) is unit-tested; wrappers (`PhoneField`, `HeightFields`, `OtpCodeField`) take an optional bind object.

**Harder:** Each form must list field names. That is intentional — conditional height units change the list explicitly.

**Revisit if:** we adopt `react-native-keyboard-controller` for sticky footers under the keyboard at scale; the named chain stays.
