import { unique } from "remeda";
import * as v from "valibot";

import { AnnouncementSchema } from "../announcement/announcement.sql";
import { CommentSchema } from "../comment/comment.sql";
import { NanoId, PapercutAccountId } from "../id";
import { OrderSchema } from "../order/order.sql";
import { PapercutAccountManagerAuthorizationSchema } from "../papercut/account.sql";
import { ProductSchema } from "../product/product.sql";
import { PushRequest } from "../replicache/schemas";
import { RoomSchema } from "../room/room.sql";
import { UserRole } from "../user/user.sql";

import type { JSONValue, WriteTransaction } from "replicache";
import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { Channel } from "../realtime";

export const Mutation = v.object({
  ...PushRequest.options[1].entries.mutations.item.entries,
  ...v.object({
    name: v.union([
      v.literal("updateUserRole"),
      v.literal("deleteUser"),
      v.literal("syncPapercutAccounts"),
      v.literal("deletePapercutAccount"),
      v.literal("createPapercutAccountManagerAuthorization"),
      v.literal("deletePapercutAccountManagerAuthorization"),
      v.literal("createRoom"),
      v.literal("updateRoom"),
      v.literal("deleteRoom"),
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
export type Mutation = v.InferOutput<typeof Mutation>;

export type AuthoritativeMutation = Record<
  Exclude<Mutation["name"], "syncPapercutAccounts">,
  (
    tx: Transaction,
    user: LuciaUser,
    args: JSONValue,
    isAuthorized: boolean,
  ) => Promise<Array<Channel>>
>;

export type OptimisticMutation = Record<
  Exclude<Mutation["name"], "syncPapercutAccounts">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tx: WriteTransaction, user: LuciaUser, args: any) => Promise<void>
>;

/**
 * Permissions required to perform each mutation to any entity within the organization.
 */
export const globalPermissions = {
  updateUserRole: ["administrator"],
  deleteUser: ["administrator"],
  syncPapercutAccounts: ["administrator"],
  deletePapercutAccount: ["administrator"],
  createPapercutAccountManagerAuthorization: ["administrator"],
  deletePapercutAccountManagerAuthorization: ["administrator"],
  createRoom: ["administrator"],
  updateRoom: ["administrator", "operator"],
  deleteRoom: ["administrator"],
  createAnnouncement: ["administrator", "operator"],
  updateAnnouncement: ["administrator", "operator"],
  deleteAnnouncement: ["administrator", "operator"],
  createProduct: ["administrator", "operator"],
  updateProduct: ["administrator", "operator"],
  deleteProduct: ["administrator", "operator"],
  createOrder: ["administrator", "operator", "manager", "customer"],
  updateOrder: ["administrator", "operator"],
  deleteOrder: ["administrator", "operator"],
  createComment: ["administrator", "operator"],
  updateComment: ["administrator"],
  deleteComment: ["administrator"],
} as const satisfies Record<Mutation["name"], Array<UserRole>>;

export const UpdateUserRoleMutationArgs = v.object({
  id: NanoId,
  role: v.picklist(UserRole.enumValues),
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type UpdateUserRoleMutationArgs = v.InferOutput<
  typeof UpdateUserRoleMutationArgs
>;

export const DeleteUserMutationArgs = v.object({
  id: NanoId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeleteUserMutationArgs = v.InferOutput<
  typeof DeleteUserMutationArgs
>;

export const SyncPapercutAccountsMutationArgs = v.undefined_();
export type SyncPapercutAccountsMutationArgs = v.InferOutput<
  typeof SyncPapercutAccountsMutationArgs
>;

export const DeletePapercutAccountMutationArgs = v.object({
  id: PapercutAccountId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeletePapercutAccountMutationArgs = v.InferOutput<
  typeof DeletePapercutAccountMutationArgs
>;

export const CreatePapercutAccountManagerAuthorizationMutationArgs =
  PapercutAccountManagerAuthorizationSchema;
export type CreatePapercutAccountManagerAuthorizationMutationArgs =
  v.InferOutput<typeof CreatePapercutAccountManagerAuthorizationMutationArgs>;

export const DeletePapercutAccountManagerAuthorizationMutationArgs = v.object({
  id: NanoId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeletePapercutAccountManagerAuthorizationMutationArgs =
  v.InferOutput<typeof DeletePapercutAccountManagerAuthorizationMutationArgs>;

export const CreateRoomMutationArgs = RoomSchema;
export type CreateRoomMutationArgs = v.InferOutput<
  typeof CreateRoomMutationArgs
>;

export const UpdateRoomMutationArgs = v.object({
  id: NanoId,
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
  ...v.partial(
    v.omit(RoomSchema, ["id", "orgId", "createdAt", "updatedAt", "deletedAt"]),
  ).entries,
});
export type UpdateRoomMutationArgs = v.InferOutput<
  typeof UpdateRoomMutationArgs
>;

export const DeleteRoomMutationArgs = v.object({
  id: NanoId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeleteRoomMutationArgs = v.InferOutput<
  typeof DeleteRoomMutationArgs
>;

export const CreateAnnouncementMutationArgs = AnnouncementSchema;
export type CreateAnnouncementMutationArgs = v.InferOutput<
  typeof CreateAnnouncementMutationArgs
>;

export const UpdateAnnouncementMutationArgs = v.object({
  id: NanoId,
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
  ...v.partial(
    v.omit(AnnouncementSchema, [
      "id",
      "orgId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateAnnouncementMutationArgs = v.InferOutput<
  typeof UpdateAnnouncementMutationArgs
>;

export const DeleteAnnouncementMutationArgs = v.object({
  id: NanoId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeleteAnnouncementMutationArgs = v.InferOutput<
  typeof DeleteAnnouncementMutationArgs
>;

export const CreateProductMutationArgs = ProductSchema;
export type CreateProductMutationArgs = v.InferOutput<
  typeof CreateProductMutationArgs
>;

export const UpdateProductMutationArgs = v.object({
  id: NanoId,
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
  ...v.partial(
    v.omit(ProductSchema, [
      "id",
      "orgId",
      "updatedAt",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateProductMutationArgs = v.InferOutput<
  typeof UpdateProductMutationArgs
>;

export const DeleteProductMutationArgs = v.object({
  id: NanoId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeleteProductMutationArgs = v.InferOutput<
  typeof DeleteProductMutationArgs
>;

export const CreateOrderMutationArgs = OrderSchema;
export type CreateOrderMutationArgs = v.InferOutput<
  typeof CreateOrderMutationArgs
>;

export const UpdateOrderMutationArgs = v.object({
  id: NanoId,
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
  ...v.partial(
    v.omit(OrderSchema, ["id", "orgId", "updatedAt", "createdAt", "deletedAt"]),
  ).entries,
});
export type UpdateOrderMutationArgs = v.InferOutput<
  typeof UpdateOrderMutationArgs
>;

export const DeleteOrderMutationArgs = v.object({
  id: NanoId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeleteOrderMutationArgs = v.InferOutput<
  typeof DeleteOrderMutationArgs
>;

export const CreateCommentMutationArgs = v.pipe(
  CommentSchema,
  v.transform(({ visibleTo, ...rest }) => ({
    visibleTo: unique(visibleTo),
    ...rest,
  })),
);
export type CreateCommentMutationArgs = v.InferOutput<
  typeof CreateCommentMutationArgs
>;

export const UpdateCommentMutationArgs = v.object({
  id: NanoId,
  orderId: NanoId,
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
  ...v.partial(
    v.omit(CommentSchema, [
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
  typeof UpdateCommentMutationArgs
>;

export const DeleteCommentMutationArgs = v.object({
  id: NanoId,
  orderId: NanoId,
  deletedAt: v.pipe(v.string(), v.isoDateTime()),
});
export type DeleteCommentMutationArgs = v.InferOutput<
  typeof DeleteCommentMutationArgs
>;
