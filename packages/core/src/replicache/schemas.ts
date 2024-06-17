import * as v from "valibot";

import { NanoId } from "../id";

import type { JSONValue } from "replicache";

export const JsonValue: v.GenericSchema<JSONValue> = v.nullable(
  v.union([
    v.number(),
    v.string(),
    v.boolean(),
    v.lazy(() => v.array(JsonValue)),
    v.lazy(() => JsonObject),
  ]),
);
export type JsonValue = v.InferOutput<typeof JsonValue>;

export const JsonObject = v.record(v.string(), v.optional(JsonValue));
export type JsonObject = v.InferOutput<typeof JsonObject>;

export const PushRequest = v.variant("pushVersion", [
  v.object({
    pushVersion: v.literal(0),
    clientID: v.pipe(v.string(), v.uuid()),
    mutations: v.array(
      v.object({
        name: v.string(),
        args: JsonValue,
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
        args: JsonValue,
        clientID: v.pipe(v.string(), v.uuid()),
        id: v.number(),
        timestamp: v.number(),
      }),
    ),
    profileID: v.string(),
    schemaVersion: v.string(),
  }),
]);
export type PushRequest = v.InferOutput<typeof PushRequest>;

export const PullRequest = v.variant("pullVersion", [
  v.object({
    pullVersion: v.literal(0),
    schemaVersion: v.string(),
    profileID: v.string(),
    cookie: JsonValue,
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
          JsonValue,
          v.object({ order: v.union([v.string(), v.number()]) }),
        ]),
      ]),
    ),
    clientGroupID: v.pipe(v.string(), v.uuid()),
  }),
]);
export type PullRequest = v.InferOutput<typeof PullRequest>;

export const Domain = v.picklist([
  "user",
  "papercutAccount",
  "papercutAccountCustomerAuthorization",
  "papercutAccountManagerAuthorization",
  "room",
  "announcement",
  "product",
  "order",
  "comment",
  "client",
]);
export type Domain = v.InferOutput<typeof Domain>;
