import * as R from "remeda";
import * as v from "valibot";

import { announcementSchema } from "../announcement/schemas";
import { commentSchema } from "../comment/schemas";
import { userRoles } from "../constants/tuples";
import { orderSchema } from "../order/schemas";
import { organizationSchema } from "../organization/schemas";
import { papercutAccountManagerAuthorizationSchema } from "../papercut/schemas";
import { productSchema } from "../product/schemas";
import { roomSchema } from "../room/schemas";
import { nanoIdSchema, papercutAccountIdSchema } from "../utils/schemas";

import type { JSONValue, WriteTransaction } from "replicache";
import type { LuciaUser } from "../auth";
import type { Channel } from "../realtime";

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

export const mutationSchema = v.object({
  ...pushRequestSchema.options[1].entries.mutations.item.entries,
  ...v.object({
    name: v.union([
      v.literal("updateOrganization"),
      v.literal("updateUserRole"),
      v.literal("deleteUser"),
      v.literal("restoreUser"),
      v.literal("syncPapercutAccounts"),
      v.literal("deletePapercutAccount"),
      v.literal("createPapercutAccountManagerAuthorization"),
      v.literal("deletePapercutAccountManagerAuthorization"),
      v.literal("createRoom"),
      v.literal("updateRoom"),
      v.literal("deleteRoom"),
      v.literal("restoreRoom"),
      v.literal("createAnnouncement"),
      v.literal("updateAnnouncement"),
      v.literal("deleteAnnouncement"),
      v.literal("createProduct"),
      v.literal("updateProduct"),
      v.literal("deleteProduct"),
      v.literal("createOrder"),
      v.literal("updateOrder"),
      v.literal("deleteOrder"),
      v.literal("createComment"),
      v.literal("updateComment"),
      v.literal("deleteComment"),
    ]),
  }).entries,
});
export type Mutation = v.InferOutput<typeof mutationSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthoritativeMutators<TSchema extends v.GenericSchema = any> =
  Record<
    Mutation["name"],
    () => (values: v.InferOutput<TSchema>) => Promise<Array<Channel>>
  >;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OptimisticMutators<TSchema extends v.GenericSchema = any> = Record<
  Exclude<Mutation["name"], "syncPapercutAccounts">,
  (
    user: LuciaUser,
  ) => (tx: WriteTransaction, values: v.InferOutput<TSchema>) => Promise<void>
>;

export const updateOrganizationMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(organizationSchema, [
      "id",
      "licenseKey",
      "oAuth2ProviderId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateOrganizationMutationArgs = v.InferOutput<
  typeof updateOrganizationMutationArgsSchema
>;

export const updateUserRoleMutationArgsSchema = v.object({
  id: nanoIdSchema,
  role: v.picklist(userRoles),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type UpdateUserRoleMutationArgs = v.InferOutput<
  typeof updateUserRoleMutationArgsSchema
>;

export const deleteUserMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteUserMutationArgs = v.InferOutput<
  typeof deleteUserMutationArgsSchema
>;

export const restoreUserMutationArgsSchema = v.object({
  id: nanoIdSchema,
});
export type RestoreUserMutationArgs = v.InferOutput<
  typeof restoreUserMutationArgsSchema
>;

export const syncPapercutAccountsMutationArgsSchema = v.undefined_();
export type SyncPapercutAccountsMutationArgs = v.InferOutput<
  typeof syncPapercutAccountsMutationArgsSchema
>;

export const deletePapercutAccountMutationArgsSchema = v.object({
  id: papercutAccountIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeletePapercutAccountMutationArgs = v.InferOutput<
  typeof deletePapercutAccountMutationArgsSchema
>;

export const createPapercutAccountManagerAuthorizationMutationArgsSchema =
  papercutAccountManagerAuthorizationSchema;
export type CreatePapercutAccountManagerAuthorizationMutationArgs =
  v.InferOutput<
    typeof createPapercutAccountManagerAuthorizationMutationArgsSchema
  >;

export const deletePapercutAccountManagerAuthorizationMutationArgsSchema =
  v.object({
    id: nanoIdSchema,
    deletedAt: v.pipe(v.string(), v.isoTimestamp()),
  });
export type DeletePapercutAccountManagerAuthorizationMutationArgs =
  v.InferOutput<
    typeof deletePapercutAccountManagerAuthorizationMutationArgsSchema
  >;

export const createRoomMutationArgsSchema = roomSchema;
export type CreateRoomMutationArgs = v.InferOutput<
  typeof createRoomMutationArgsSchema
>;

export const updateRoomMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(roomSchema, ["id", "orgId", "createdAt", "updatedAt", "deletedAt"]),
  ).entries,
});
export type UpdateRoomMutationArgs = v.InferOutput<
  typeof updateRoomMutationArgsSchema
>;

export const deleteRoomMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteRoomMutationArgs = v.InferOutput<
  typeof deleteRoomMutationArgsSchema
>;

export const restoreRoomMutationArgsSchema = v.object({
  id: nanoIdSchema,
});
export type RestoreRoomMutationArgs = v.InferOutput<
  typeof restoreRoomMutationArgsSchema
>;

export const createAnnouncementMutationArgsSchema = announcementSchema;
export type CreateAnnouncementMutationArgs = v.InferOutput<
  typeof createAnnouncementMutationArgsSchema
>;

export const updateAnnouncementMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(announcementSchema, [
      "id",
      "orgId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateAnnouncementMutationArgs = v.InferOutput<
  typeof updateAnnouncementMutationArgsSchema
>;

export const deleteAnnouncementMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteAnnouncementMutationArgs = v.InferOutput<
  typeof deleteAnnouncementMutationArgsSchema
>;

export const createProductMutationArgsSchema = productSchema;
export type CreateProductMutationArgs = v.InferOutput<
  typeof createProductMutationArgsSchema
>;

export const updateProductMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(productSchema, [
      "id",
      "orgId",
      "updatedAt",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateProductMutationArgs = v.InferOutput<
  typeof updateProductMutationArgsSchema
>;

export const deleteProductMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteProductMutationArgs = v.InferOutput<
  typeof deleteProductMutationArgsSchema
>;

export const createOrderMutationArgsSchema = orderSchema;
export type CreateOrderMutationArgs = v.InferOutput<
  typeof createOrderMutationArgsSchema
>;

export const updateOrderMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(orderSchema, ["id", "orgId", "updatedAt", "createdAt", "deletedAt"]),
  ).entries,
});
export type UpdateOrderMutationArgs = v.InferOutput<
  typeof updateOrderMutationArgsSchema
>;

export const deleteOrderMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteOrderMutationArgs = v.InferOutput<
  typeof deleteOrderMutationArgsSchema
>;

export const createCommentMutationArgsSchema = v.pipe(
  commentSchema,
  v.transform(({ visibleTo, ...rest }) => ({
    visibleTo: R.unique(visibleTo),
    ...rest,
  })),
);
export type CreateCommentMutationArgs = v.InferOutput<
  typeof createCommentMutationArgsSchema
>;

export const updateCommentMutationArgsSchema = v.object({
  id: nanoIdSchema,
  orderId: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(commentSchema, [
      "id",
      "orgId",
      "orderId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateCommentMutationArgs = v.InferOutput<
  typeof updateCommentMutationArgsSchema
>;

export const deleteCommentMutationArgsSchema = v.object({
  id: nanoIdSchema,
  orderId: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteCommentMutationArgs = v.InferOutput<
  typeof deleteCommentMutationArgsSchema
>;
