import { hashNarrativeInput, type LlmCacheStore } from './cache';
import {
  getCircuitState,
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from './circuit';
import { assertDeidentified } from './deidentify';
import { fallbackNarrative } from './fallback';
import { runGuardrails, type GuardrailReason } from './guardrails';
import {
  MEAL_NARRATIVE_JSON_SCHEMA,
  MEAL_NARRATIVE_SYSTEM,
  PROMPT_VERSION,
} from './prompts/meal-narrative.v1';
import { resolvePromptPack } from './prompts/packs';
import { type AiConfig, type NarrativeInput, type NarrativeOutput } from './types';

export type NarrateResult = {
  readonly output: NarrativeOutput;
  readonly modelId: string;
  readonly promptVersion: string;
  readonly adapterVersion: string | null;
  readonly fellBack: boolean;
  readonly cacheHit: boolean;
  readonly latencyMs: number;
  readonly guardrail: GuardrailReason | null;
  readonly rawLlmOutput: Record<string, unknown> | null;
  readonly inputHash: Buffer | null;
  readonly circuitOpen: boolean;
};

export type NarrateOptions = {
  readonly cache?: LlmCacheStore;
  readonly expectedMealCount?: number;
};

const MAX_RETRIES = 2;

/**
 * Layer-3 dispatcher. `fallback` is instant and always available; `local` /
 * `hosted` call an OpenAI-compatible endpoint with schema-constrained decoding,
 * cache, guardrails, retries, and a circuit breaker — then degrade to templates.
 */
export const narrate = async (
  input: NarrativeInput,
  config: AiConfig,
  options: NarrateOptions = {},
): Promise<NarrateResult> => {
  const violation = assertDeidentified(input);
  if (violation !== null) {
    throw new Error(`layer-3 input failed de-identification: ${violation.kind}`);
  }

  const promptVersion = config.promptVersion ?? PROMPT_VERSION;
  const adapterVersion = config.adapterVersion ?? null;
  const modelId = config.model ?? 'unknown';
  const started = Date.now();
  const baseMeta = {
    promptVersion,
    adapterVersion,
    inputHash: null as Buffer | null,
    circuitOpen: false,
  };

  const finishFallback = (
    extras: Partial<NarrateResult> & { fellBack: boolean },
  ): NarrateResult => ({
    output: fallbackNarrative(input),
    modelId: extras.modelId ?? 'fallback-templates',
    promptVersion,
    adapterVersion,
    fellBack: extras.fellBack,
    cacheHit: extras.cacheHit ?? false,
    latencyMs: Date.now() - started,
    guardrail: extras.guardrail ?? null,
    rawLlmOutput: extras.rawLlmOutput ?? null,
    inputHash: extras.inputHash ?? null,
    circuitOpen: extras.circuitOpen ?? false,
  });

  if (config.mode === 'fallback') {
    return finishFallback({ fellBack: false, ...baseMeta });
  }

  const inputHash = hashNarrativeInput({
    promptVersion,
    modelId,
    ...(adapterVersion !== null ? { adapterVersion } : {}),
    input,
  });

  if (options.cache) {
    const cached = await options.cache.get(inputHash);
    if (cached !== null) {
      const gated = runGuardrails(input, cached, options.expectedMealCount);
      if (gated.ok) {
        return {
          output: gated.output,
          modelId,
          promptVersion,
          adapterVersion,
          fellBack: false,
          cacheHit: true,
          latencyMs: Date.now() - started,
          guardrail: null,
          rawLlmOutput: null,
          inputHash,
          circuitOpen: false,
        };
      }
    }
  }

  if (isCircuitOpen()) {
    return finishFallback({
      fellBack: true,
      inputHash,
      circuitOpen: true,
      modelId: 'fallback-templates',
    });
  }

  let lastRaw: Record<string, unknown> | null = null;
  let lastGuardrail: GuardrailReason | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const raw = await callOpenAiCompatible(input, config, promptVersion);
      lastRaw =
        typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : { raw };
      const gated = runGuardrails(input, raw, options.expectedMealCount);
      if (gated.ok) {
        recordCircuitSuccess();
        if (options.cache) {
          await options.cache.set(inputHash, gated.output, modelId);
        }
        return {
          output: gated.output,
          modelId,
          promptVersion,
          adapterVersion,
          fellBack: false,
          cacheHit: false,
          latencyMs: Date.now() - started,
          guardrail: null,
          rawLlmOutput: lastRaw,
          inputHash,
          circuitOpen: false,
        };
      }
      lastGuardrail = gated.reason;
      // Guardrail rejection is not a transport failure — do not open the circuit.
      break;
    } catch (error) {
      const status = httpStatusFromError(error);
      if (status !== null && status >= 400 && status < 500) break;
      recordCircuitFailure();
      if (attempt === MAX_RETRIES) break;
    }
  }

  return finishFallback({
    fellBack: true,
    inputHash,
    guardrail: lastGuardrail,
    rawLlmOutput: lastRaw,
    circuitOpen: getCircuitState().openUntilMs > Date.now(),
    modelId: 'fallback-templates',
  });
};

const httpStatusFromError = (error: unknown): number | null => {
  if (!(error instanceof Error)) return null;
  const match = /^llm http (\d+)/.exec(error.message);
  return match?.[1] !== undefined ? Number(match[1]) : null;
};

const callOpenAiCompatible = async (
  input: NarrativeInput,
  config: AiConfig,
  promptVersion: string,
): Promise<unknown> => {
  if (!config.baseUrl) throw new Error('AI_BASE_URL not configured');
  const pack = resolvePromptPack(config.promptPackId);
  const system =
    pack.systemAddendum.length > 0
      ? `${MEAL_NARRATIVE_SYSTEM} ${pack.systemAddendum}`
      : MEAL_NARRATIVE_SYSTEM;
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      'x-gymos-prompt-version': promptVersion,
      ...(config.adapterVersion ? { 'x-gymos-adapter-version': config.adapterVersion } : {}),
      ...(pack.id !== 'default' ? { 'x-gymos-prompt-pack': pack.id } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'meal_narrative',
          strict: true,
          schema: MEAL_NARRATIVE_JSON_SCHEMA,
        },
      },
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`llm http ${response.status}`);
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('llm returned no content');
  return JSON.parse(content) as unknown;
};
