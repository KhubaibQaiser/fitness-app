import { assertDeidentified } from './deidentify';
import { fallbackNarrative } from './fallback';
import {
  containsNumericClaim,
  narrativeOutputSchema,
  type AiConfig,
  type NarrativeInput,
  type NarrativeOutput,
} from './types';

export type NarrateResult = {
  readonly output: NarrativeOutput;
  readonly modelId: string;
  readonly fellBack: boolean;
  readonly latencyMs: number;
};

/**
 * Layer-3 dispatcher. `fallback` is instant and always available; `local`
 * calls llama.cpp's OpenAI-compatible endpoint with schema-constrained
 * decoding and degrades to the fallback on any failure. The de-identification
 * guard runs regardless of mode; a violation is a hard error (never send).
 */
export const narrate = async (input: NarrativeInput, config: AiConfig): Promise<NarrateResult> => {
  const violation = assertDeidentified(input);
  if (violation !== null) {
    throw new Error(`layer-3 input failed de-identification: ${violation.kind}`);
  }

  const started = Date.now();
  if (config.mode === 'local' || config.mode === 'hosted') {
    try {
      const output = await callOpenAiCompatible(input, config);
      const parsed = narrativeOutputSchema.safeParse(output);
      if (parsed.success && !containsNumericClaim(parsed.data)) {
        return {
          output: parsed.data,
          modelId: config.model ?? 'unknown',
          fellBack: false,
          latencyMs: Date.now() - started,
        };
      }
    } catch {
      // fall through to deterministic fallback — generation never fails on the LLM
    }
  }

  return {
    output: fallbackNarrative(input),
    modelId: 'fallback-templates',
    fellBack: config.mode !== 'fallback',
    latencyMs: Date.now() - started,
  };
};

const callOpenAiCompatible = async (input: NarrativeInput, config: AiConfig): Promise<unknown> => {
  if (!config.baseUrl) throw new Error('AI_BASE_URL not configured');
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You name meals and write short prep notes for a meal plan. Respond with JSON only. ' +
            'NEVER mention calories, macros, or any nutrition numbers — those are provided elsewhere.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'meal_narrative',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['days'],
            properties: {
              days: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['meals'],
                  properties: {
                    meals: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['name', 'prepNotes'],
                        properties: {
                          name: { type: 'string', maxLength: 60 },
                          prepNotes: { type: 'string', maxLength: 280 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
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
