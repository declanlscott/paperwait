import * as v from "valibot";

import { announcementMutationNames } from "../announcement/shared";
import { commentMutationNames } from "../comment/shared";
import { orderMutationNames } from "../order/shared";
import { organizationMutationNames } from "../organization/shared";
import { papercutMutationNames } from "../papercut/shared";
import { productMutationNames } from "../product/shared";
import { roomMutationNames } from "../room/shared";
import { userMutationNames } from "../user/shared";

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
  ...organizationMutationNames,
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
