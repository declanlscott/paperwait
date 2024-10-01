import * as v from "valibot";

import { announcementMutationNames } from "../announcements/shared";
import { commentMutationNames } from "../comments/shared";
import { orderMutationNames } from "../orders/shared";
import { papercutMutationNames } from "../papercut/shared";
import { productMutationNames } from "../products/shared";
import { roomMutationNames } from "../rooms/shared";
import { tenantMutationNames } from "../tenants/shared";
import { userMutationNames } from "../users/shared";

export const replicacheMetaTableName = "replicache_meta";
export const replicacheClientGroupsTableName = "replicache_client_groups";
export const replicacheClientsTableName = "replicache_clients";
export const replicacheClientViewsTableName = "replicache_client_views";

export const genericMutationSchema = v.object({
  name: v.string(),
  args: v.unknown(),
  id: v.number(),
  timestamp: v.number(),
  clientID: v.pipe(v.string(), v.uuid()),
});
export type GenericMutation = v.InferOutput<typeof genericMutationSchema>;

export const mutationNameSchema = v.picklist([
  ...announcementMutationNames,
  ...commentMutationNames,
  ...orderMutationNames,
  ...tenantMutationNames,
  ...papercutMutationNames,
  ...productMutationNames,
  ...roomMutationNames,
  ...userMutationNames,
]);
export type MutationName = v.InferOutput<typeof mutationNameSchema>;

export const pushRequestSchema = v.variant("pushVersion", [
  v.looseObject({
    pushVersion: v.literal(0),
  }),
  v.object({
    pushVersion: v.literal(1),
    clientGroupID: v.pipe(v.string(), v.uuid()),
    mutations: v.array(genericMutationSchema),
    profileID: v.string(),
    schemaVersion: v.string(),
  }),
]);
export type PushRequest = v.InferOutput<typeof pushRequestSchema>;

export const pullRequestSchema = v.variant("pullVersion", [
  v.looseObject({
    pullVersion: v.literal(0),
  }),
  v.object({
    pullVersion: v.literal(1),
    schemaVersion: v.string(),
    profileID: v.string(),
    cookie: v.nullable(v.object({ order: v.number() })),
    clientGroupID: v.pipe(v.string(), v.uuid()),
  }),
]);
export type PullRequest = v.InferOutput<typeof pullRequestSchema>;
