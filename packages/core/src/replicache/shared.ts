import * as v from "valibot";

import { announcementMutationNames } from "../announcements/shared";
import { commentMutationNames } from "../comments/shared";
import { invoiceMutationNames } from "../invoices/shared";
import { orderMutationNames } from "../orders/shared";
import { papercutMutationNames } from "../papercut/shared";
import { productMutationNames } from "../products/shared";
import {
  deliveryOptionsMutationNames,
  roomMutationNames,
  workflowMutationNames,
} from "../rooms/shared";
import { tenantMutationNames } from "../tenants/shared";
import { userProfileMutationNames } from "../users/shared";

import type { UserRole } from "../users/shared";

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
  ...deliveryOptionsMutationNames,
  ...invoiceMutationNames,
  ...orderMutationNames,
  ...tenantMutationNames,
  ...papercutMutationNames,
  ...productMutationNames,
  ...roomMutationNames,
  ...userProfileMutationNames,
  ...workflowMutationNames,
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

export const mutationRbac = {
  createAnnouncement: ["administrator", "operator"],
  updateAnnouncement: ["administrator", "operator"],
  deleteAnnouncement: ["administrator", "operator"],
  createComment: ["administrator", "operator"],
  updateComment: ["administrator"],
  deleteComment: ["administrator"],
  setDeliveryOptions: ["administrator", "operator"],
  createInvoice: ["administrator", "operator"],
  createOrder: ["administrator", "operator", "manager", "customer"],
  updateOrder: ["administrator", "operator"],
  deleteOrder: ["administrator", "operator"],
  updateTenant: ["administrator"],
  updatePapercutAccountApprovalThreshold: ["administrator", "operator"],
  deletePapercutAccount: ["administrator"],
  createPapercutAccountManagerAuthorization: ["administrator"],
  deletePapercutAccountManagerAuthorization: ["administrator"],
  createProduct: ["administrator", "operator"],
  updateProduct: ["administrator", "operator"],
  deleteProduct: ["administrator", "operator"],
  createRoom: ["administrator"],
  updateRoom: ["administrator", "operator"],
  deleteRoom: ["administrator"],
  restoreRoom: ["administrator"],
  updateUserProfileRole: ["administrator"],
  deleteUserProfile: ["administrator"],
  restoreUserProfile: ["administrator"],
  setWorkflow: ["administrator", "operator"],
} as const satisfies Record<MutationName, Array<UserRole>>;
