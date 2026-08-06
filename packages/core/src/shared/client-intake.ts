/** Required e-sign payload collected during onboarding. */
export type SignedClientIntake = {
  signaturePngBase64: string;
  signedAt: string;
  heightDisplayUnit?: 'cm' | 'ft_in' | undefined;
};

/** Like Partial, but compatible with exactOptionalPropertyTypes + Zod infer. */
type Soft<T> = {
  [K in keyof T]?: T[K] | undefined;
};

/** Persisted intake meta — may be incomplete until onboarding finishes. */
export type ClientIntake = Soft<SignedClientIntake>;
