import { createHash } from 'node:crypto';
import { PROMPT_VERSION } from './prompts/meal-narrative.v1';
import type { NarrativeInput, NarrativeOutput } from './types';

export type LlmCacheStore = {
  get: (inputHash: Buffer) => Promise<NarrativeOutput | null>;
  set: (inputHash: Buffer, output: NarrativeOutput, modelId: string) => Promise<void>;
};

export const hashNarrativeInput = (args: {
  promptVersion: string;
  modelId: string;
  adapterVersion?: string;
  input: NarrativeInput;
}): Buffer => {
  const payload = JSON.stringify({
    promptVersion: args.promptVersion,
    modelId: args.modelId,
    adapterVersion: args.adapterVersion ?? null,
    input: args.input,
  });
  return createHash('sha256').update(payload).digest();
};

export { PROMPT_VERSION };
