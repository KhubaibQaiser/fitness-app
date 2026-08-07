/** Simple consecutive-failure circuit for Layer-3 HTTP calls. */
export type CircuitState = {
  failures: number;
  openUntilMs: number;
};

const DEFAULT: CircuitState = { failures: 0, openUntilMs: 0 };

let state: CircuitState = { ...DEFAULT };

export const CIRCUIT = {
  failureThreshold: 3,
  openMs: 5 * 60_000,
} as const;

export const resetCircuit = (): void => {
  state = { ...DEFAULT };
};

export const isCircuitOpen = (now = Date.now()): boolean => now < state.openUntilMs;

export const recordCircuitSuccess = (): void => {
  state = { ...DEFAULT };
};

export const recordCircuitFailure = (now = Date.now()): void => {
  const failures = state.failures + 1;
  if (failures >= CIRCUIT.failureThreshold) {
    state = { failures, openUntilMs: now + CIRCUIT.openMs };
  } else {
    state = { failures, openUntilMs: state.openUntilMs };
  }
};

export const getCircuitState = (): Readonly<CircuitState> => state;
