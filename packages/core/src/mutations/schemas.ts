import { createSelectSchema } from "drizzle-valibot";
import { unique } from "remeda";
import {
  array,
  isoDateTime,
  literal,
  merge,
  object,
  omit,
  partial,
  picklist,
  string,
  transform,
  undefined_,
  variant,
} from "valibot";

import { Announcement } from "../announcement/announcement.sql";
import { Comment } from "../comment/comment.sql";
import { NanoId, PapercutAccountId } from "../id";
import { Order } from "../order/order.sql";
import { PapercutAccountManagerAuthorization } from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { PushRequest } from "../replicache/schemas";
import { Room } from "../room/room.sql";
import { UserRole } from "../user/user.sql";

import type { BaseSchema, Output } from "valibot";

export const UpdateUserRoleMutationArgs = object({
  id: NanoId,
  role: picklist(UserRole.enumValues),
  updatedAt: string([isoDateTime()]),
});
export type UpdateUserRoleMutationArgs = Output<
  typeof UpdateUserRoleMutationArgs
>;

export const DeleteUserMutationArgs = object({
  id: NanoId,
  deletedAt: string([isoDateTime()]),
});
export type DeleteUserMutationArgs = Output<typeof DeleteUserMutationArgs>;

export const SyncPapercutAccountsMutationArgs = undefined_();
export type SyncPapercutAccountsMutationArgs = Output<
  typeof SyncPapercutAccountsMutationArgs
>;

export const DeletePapercutAccountMutationArgs = object({
  id: PapercutAccountId,
  deletedAt: string([isoDateTime()]),
});
export type DeletePapercutAccountMutationArgs = Output<
  typeof DeletePapercutAccountMutationArgs
>;

export const CreatePapercutAccountManagerAuthorizationMutationArgs =
  createSelectSchema(PapercutAccountManagerAuthorization);
export type CreatePapercutAccountManagerAuthorizationMutationArgs = Output<
  typeof CreatePapercutAccountManagerAuthorizationMutationArgs
>;

export const DeletePapercutAccountManagerAuthorizationMutationArgs = object({
  id: NanoId,
  deletedAt: string([isoDateTime()]),
});
export type DeletePapercutAccountManagerAuthorizationMutationArgs = Output<
  typeof DeletePapercutAccountManagerAuthorizationMutationArgs
>;

export const CreateRoomMutationArgs = createSelectSchema(Room);
export type CreateRoomMutationArgs = Output<typeof CreateRoomMutationArgs>;

export const UpdateRoomMutationArgs = object({
  id: NanoId,
  ...partial(
    omit(createSelectSchema(Room), ["id", "orgId", "createdAt", "deletedAt"]),
  ).entries,
});
export type UpdateRoomMutationArgs = Output<typeof UpdateRoomMutationArgs>;

export const DeleteRoomMutationArgs = object({
  id: NanoId,
  deletedAt: string([isoDateTime()]),
});
export type DeleteRoomMutationArgs = Output<typeof DeleteRoomMutationArgs>;

export const CreateProductMutationArgs = createSelectSchema(Product);
export type CreateProductMutationArgs = Output<
  typeof CreateProductMutationArgs
>;

export const CreateAnnouncementMutationArgs = createSelectSchema(Announcement);
export type CreateAnnouncementMutationArgs = Output<
  typeof CreateAnnouncementMutationArgs
>;

export const UpdateAnnouncementMutationArgs = object({
  id: NanoId,
  ...partial(
    omit(createSelectSchema(Announcement), [
      "id",
      "orgId",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateAnnouncementMutationArgs = Output<
  typeof UpdateAnnouncementMutationArgs
>;

export const DeleteAnnouncementMutationArgs = object({
  id: NanoId,
  deletedAt: string([isoDateTime()]),
});
export type DeleteAnnouncementMutationArgs = Output<
  typeof DeleteAnnouncementMutationArgs
>;

export const UpdateProductMutationArgs = object({
  id: NanoId,
  ...partial(
    omit(createSelectSchema(Product), [
      "id",
      "orgId",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateProductMutationArgs = Output<
  typeof UpdateProductMutationArgs
>;

export const DeleteProductMutationArgs = object({
  id: NanoId,
  deletedAt: string([isoDateTime()]),
});
export type DeleteProductMutationArgs = Output<
  typeof DeleteProductMutationArgs
>;

export const CreateOrderMutationArgs = createSelectSchema(Order);
export type CreateOrderMutationArgs = Output<typeof CreateOrderMutationArgs>;

export const UpdateOrderMutationArgs = object({
  id: NanoId,
  ...partial(
    omit(CreateOrderMutationArgs, ["id", "orgId", "createdAt", "deletedAt"]),
  ).entries,
});
export type UpdateOrderMutationArgs = Output<typeof UpdateOrderMutationArgs>;

export const DeleteOrderMutationArgs = object({
  id: NanoId,
  deletedAt: string([isoDateTime()]),
});
export type DeleteOrderMutationArgs = Output<typeof DeleteOrderMutationArgs>;

export const CreateCommentMutationArgs = transform(
  object({
    ...omit(createSelectSchema(Comment), ["visibleTo"]).entries,
    visibleTo: array(picklist(UserRole.enumValues)),
  }),
  ({ visibleTo, ...rest }) => ({ ...rest, visibleTo: unique(visibleTo) }),
);
export type CreateCommentMutationArgs = Output<
  typeof CreateCommentMutationArgs
>;

export const UpdateCommentMutationArgs = object({
  id: NanoId,
  orderId: NanoId,
  ...partial(
    omit(CreateCommentMutationArgs, [
      "id",
      "orgId",
      "orderId",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateCommentMutationArgs = Output<
  typeof UpdateCommentMutationArgs
>;

export const DeleteCommentMutationArgs = object({
  id: NanoId,
  orderId: NanoId,
  deletedAt: string([isoDateTime()]),
});
export type DeleteCommentMutationArgs = Output<
  typeof DeleteCommentMutationArgs
>;

export const BaseMutation = PushRequest.options[1].entries.mutations.item;

function mutation<TName extends string, TArgs extends BaseSchema>(
  name: TName,
  Args: TArgs,
) {
  return merge([
    BaseMutation,
    object({
      name: literal(name),
      args: Args,
    }),
  ]);
}

export const Mutation = variant("name", [
  mutation("updateUserRole", UpdateUserRoleMutationArgs),
  mutation("deleteUser", DeleteUserMutationArgs),
  mutation("syncPapercutAccounts", SyncPapercutAccountsMutationArgs),
  mutation("deletePapercutAccount", DeletePapercutAccountMutationArgs),
  mutation(
    "createPapercutAccountManagerAuthorization",
    CreatePapercutAccountManagerAuthorizationMutationArgs,
  ),
  mutation(
    "deletePapercutAccountManagerAuthorization",
    DeletePapercutAccountManagerAuthorizationMutationArgs,
  ),
  mutation("createRoom", CreateRoomMutationArgs),
  mutation("updateRoom", UpdateRoomMutationArgs),
  mutation("deleteRoom", DeleteRoomMutationArgs),
  mutation("createAnnouncement", CreateAnnouncementMutationArgs),
  mutation("updateAnnouncement", UpdateAnnouncementMutationArgs),
  mutation("deleteAnnouncement", DeleteAnnouncementMutationArgs),
  mutation("createProduct", CreateProductMutationArgs),
  mutation("updateProduct", UpdateProductMutationArgs),
  mutation("deleteProduct", DeleteProductMutationArgs),
  mutation("createOrder", CreateOrderMutationArgs),
  mutation("updateOrder", UpdateOrderMutationArgs),
  mutation("deleteOrder", DeleteOrderMutationArgs),
  mutation("createComment", CreateCommentMutationArgs),
  mutation("updateComment", UpdateCommentMutationArgs),
  mutation("deleteComment", DeleteCommentMutationArgs),
]);
export type Mutation = Output<typeof Mutation>;

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
