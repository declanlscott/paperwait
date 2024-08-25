import * as v from "valibot";

import type { JSONValue } from "replicache";

export const jsonValueSchema: v.GenericSchema<JSONValue> = v.nullable(
  v.union([
    v.number(),
    v.string(),
    v.boolean(),
    v.lazy(() => v.array(jsonValueSchema)),
    v.lazy(() => jsonObjectSchema),
  ]),
);
export type JsonValue = v.InferOutput<typeof jsonValueSchema>;

export const jsonObjectSchema = v.record(
  v.string(),
  v.optional(jsonValueSchema),
);
export type JsonObject = v.InferOutput<typeof jsonObjectSchema>;

export const pushRequestSchema = v.variant("pushVersion", [
  v.object({
    pushVersion: v.literal(0),
    clientID: v.pipe(v.string(), v.uuid()),
    mutations: v.array(
      v.object({
        name: v.string(),
        args: jsonValueSchema,
        id: v.number(),
        timestamp: v.number(),
      }),
    ),
    profileID: v.string(),
    schemaVersion: v.string(),
  }),
  v.object({
    pushVersion: v.literal(1),
    clientGroupID: v.pipe(v.string(), v.uuid()),
    mutations: v.array(
      v.object({
        name: v.string(),
        args: jsonValueSchema,
        clientID: v.pipe(v.string(), v.uuid()),
        id: v.number(),
        timestamp: v.number(),
      }),
    ),
    profileID: v.string(),
    schemaVersion: v.string(),
  }),
]);
export type PushRequest = v.InferOutput<typeof pushRequestSchema>;

export const pullRequestSchema = v.variant("pullVersion", [
  v.object({
    pullVersion: v.literal(0),
    schemaVersion: v.string(),
    profileID: v.string(),
    cookie: jsonValueSchema,
    clientID: v.pipe(v.string(), v.uuid()),
    lastMutationID: v.number(),
  }),
  v.object({
    pullVersion: v.literal(1),
    schemaVersion: v.string(),
    profileID: v.string(),
    cookie: v.nullable(
      v.union([
        v.string(),
        v.number(),
        v.intersect([
          jsonValueSchema,
          v.object({ order: v.union([v.string(), v.number()]) }),
        ]),
      ]),
    ),
    clientGroupID: v.pipe(v.string(), v.uuid()),
  }),
]);
export type PullRequest = v.InferOutput<typeof pullRequestSchema>;
