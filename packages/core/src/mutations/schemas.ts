import { createInsertSchema } from "drizzle-valibot";
import { literal, merge, object, picklist, undefined_, variant } from "valibot";

import { NanoId, PapercutAccountId } from "../id";
import { Order } from "../order/order.sql";
import { PapercutAccountManagerAuthorization } from "../papercut";
import { PushRequest } from "../replicache/schemas";
import { UserRole } from "../user/user.sql";

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

export const SyncPapercutAccountsMutationArgs = undefined_();
export type SyncPapercutAccountsMutationArgs = Output<
  typeof SyncPapercutAccountsMutationArgs
>;

export const DeletePapercutAccountMutationArgs = object({
  id: PapercutAccountId,
});
export type DeletePapercutAccountMutationArgs = Output<
  typeof DeletePapercutAccountMutationArgs
>;

export const CreatePapercutAccountManagerAuthorizationMutationArgs =
  createInsertSchema(PapercutAccountManagerAuthorization);
export type CreatePapercutAccountManagerAuthorizationMutationArgs = Output<
  typeof CreatePapercutAccountManagerAuthorizationMutationArgs
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
  mutation("syncPapercutAccounts", SyncPapercutAccountsMutationArgs),
  mutation("deletePapercutAccount", DeletePapercutAccountMutationArgs),
  mutation(
    "createPapercutAccountManagerAuthorization",
    CreatePapercutAccountManagerAuthorizationMutationArgs,
  ),
]);
export type Mutation = Output<typeof Mutation>;

export const permissions = {
  updateUserRole: ["administrator"],
  deleteUser: ["administrator"],
  createOrder: ["administrator", "operator", "manager", "customer"],
  deleteOrder: ["administrator", "operator"],
  syncPapercutAccounts: ["administrator"],
  deletePapercutAccount: ["administrator"],
  createPapercutAccountManagerAuthorization: ["administrator"],
} as const satisfies Record<Mutation["name"], Array<UserRole>>;
