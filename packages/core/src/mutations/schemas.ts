import { createInsertSchema } from "drizzle-valibot";
import { literal, merge, object, picklist, undefined_, variant } from "valibot";

import { NanoId } from "../nano-id";
import { Order } from "../order/order.sql";
import { PushRequest } from "../replicache/schemas";
import { UserRole } from "../user/user.sql";
import { SharedAccountId } from "../xml-rpc/schemas";

import type { BaseSchema, Output } from "valibot";

export const DeleteUserMutationArgs = object({
  id: NanoId,
});
export type DeleteUserMutationArgs = Output<typeof DeleteUserMutationArgs>;

export const UpdateUserRoleMutationArgs = object({
  id: NanoId,
  role: picklist(UserRole.enumValues),
});
export type UpdateUserRoleMutationArgs = Output<
  typeof UpdateUserRoleMutationArgs
>;

export const CreateOrderMutationArgs = createInsertSchema(Order);
export type CreateOrderMutationArgs = Output<typeof CreateOrderMutationArgs>;

export const DeleteOrderMutationArgs = object({ id: NanoId });
export type DeleteOrderMutationArgs = Output<typeof DeleteOrderMutationArgs>;

export const SyncSharedAccountsMutationArgs = undefined_();
export type SyncSharedAccountsMutationArgs = Output<
  typeof SyncSharedAccountsMutationArgs
>;

export const DeleteSharedAccountMutationArgs = object({ id: SharedAccountId });
export type DeleteSharedAccountMutationArgs = Output<
  typeof DeleteSharedAccountMutationArgs
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
  mutation("deleteUser", DeleteUserMutationArgs),
  mutation("updateUserRole", UpdateUserRoleMutationArgs),
  mutation("createOrder", CreateOrderMutationArgs),
  mutation("deleteOrder", DeleteOrderMutationArgs),
  mutation("syncSharedAccounts", SyncSharedAccountsMutationArgs),
  mutation("deleteSharedAccount", DeleteSharedAccountMutationArgs),
]);
export type Mutation = Output<typeof Mutation>;

export const permissions = {
  updateUserRole: ["administrator"],
  deleteUser: ["administrator"],
  createOrder: ["administrator", "technician", "manager", "customer"],
  deleteOrder: ["administrator", "technician"],
  syncSharedAccounts: ["administrator"],
  deleteSharedAccount: ["administrator"],
} as const satisfies Record<Mutation["name"], Array<UserRole>>;
