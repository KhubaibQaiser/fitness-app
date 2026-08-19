import { type OpenAPIHono, type z } from '@hono/zod-openapi';
import { type Context } from 'hono';
import { type Principal } from '@gymos/modules/identity';
import * as dto from './schemas';

export type GymosVars = { requestId: string; principal: Principal };
export type AppContext = Context<{ Variables: GymosVars }>;
export type GymosApp = OpenAPIHono<{ Variables: GymosVars }>;

export const json = <S extends z.ZodType>(schema: S) => ({
  content: { 'application/json': { schema } },
});

/** Spec-side documentation for error statuses (bodies are problem+json). */
export const problemDocs = (...statuses: number[]) =>
  Object.fromEntries(
    statuses.map((status) => [status, { description: 'Problem details', ...json(dto.anyObject) }]),
  );
