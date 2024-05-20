import {
  array,
  boolean,
  intersect,
  lazy,
  literal,
  merge,
  nullable,
  number,
  object,
  optional,
  picklist,
  record,
  string,
  union,
  unknown,
  variant,
} from "valibot";

import { UserRole } from "../user";
import { NanoId } from "../utils";

import type { JSONValue } from "replicache";
import type { BaseSchema, Output } from "valibot";

export const JsonValue: BaseSchema<JSONValue> = nullable(
  union([
    number(),
    string(),
    boolean(),
    lazy(() => array(JsonValue)),
    lazy(() => JsonObject),
  ]),
);
export type JsonValue = Output<typeof JsonValue>;

export const JsonObject = record(string(), optional(JsonValue));
export type JsonObject = Output<typeof JsonObject>;

export const PushRequest = variant("pushVersion", [
  object({
    pushVersion: literal(0),
    clientID: NanoId,
    mutations: array(
      object({
        name: string(),
        args: JsonValue,
        id: number(),
        timestamp: number(),
      }),
    ),
    profileID: string(),
    schemaVersion: string(),
  }),
  object({
    pushVersion: literal(1),
    clientGroupID: NanoId,
    mutations: array(
      object({
        name: string(),
        args: JsonValue,
        clientID: NanoId,
        id: number(),
        timestamp: number(),
      }),
    ),
    profileID: string(),
    schemaVersion: string(),
  }),
]);
export type PushRequest = Output<typeof PushRequest>;

export const UpdateUserRoleMutationArgs = object({
  userId: NanoId,
  newRole: picklist(UserRole.enumValues),
});
export type UpdateUserRoleMutationArgs = Output<
  typeof UpdateUserRoleMutationArgs
>;

export const BaseMutation = PushRequest.options[1].entries.mutations.item;

export const Mutation = variant("name", [
  merge([
    BaseMutation,
    object({
      name: literal("updateUserRole"),
      args: UpdateUserRoleMutationArgs,
    }),
  ]),
  merge([
    BaseMutation,
    object({
      name: literal("createOrder"),
      // TODO: `createOrder` args
      args: unknown(),
    }),
  ]),
]);
export type Mutation = Output<typeof Mutation>;

export const mutationPermissions = {
  updateUserRole: ["administrator"],
  createOrder: ["administrator", "technician", "manager", "customer"],
} as const satisfies Record<Mutation["name"], Array<UserRole>>;

export const PullRequest = variant("pullVersion", [
  object({
    pullVersion: literal(0),
    schemaVersion: string(),
    profileID: string(),
    cookie: JsonValue,
    clientID: NanoId,
    lastMutationID: number(),
  }),
  object({
    pullVersion: literal(1),
    schemaVersion: string(),
    profileID: string(),
    cookie: nullable(
      union([
        string(),
        number(),
        intersect([JsonValue, object({ order: union([string(), number()]) })]),
      ]),
    ),
    clientGroupID: NanoId,
  }),
]);
export type PullRequest = Output<typeof PullRequest>;

export const Domain = picklist(["user", "order", "client"]);
export type Domain = Output<typeof Domain>;
