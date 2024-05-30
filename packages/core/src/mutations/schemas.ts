import { createInsertSchema } from "drizzle-valibot";
import { literal, merge, object, picklist, variant } from "valibot";

import { NanoId } from "../nano-id";
import { Order } from "../order/order.sql";
import { PushRequest } from "../replicache/schemas";
import { UserRole } from "../user/user.sql";

import type { Output } from "valibot";

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

export const BaseMutation = PushRequest.options[1].entries.mutations.item;

export const Mutation = variant("name", [
  merge([
    BaseMutation,
    object({
      name: literal("deleteUser"),
      args: DeleteUserMutationArgs,
    }),
  ]),
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
      args: CreateOrderMutationArgs,
    }),
  ]),
  merge([
    BaseMutation,
    object({
      name: literal("deleteOrder"),
      args: DeleteOrderMutationArgs,
    }),
  ]),
]);
export type Mutation = Output<typeof Mutation>;

export const permissions = {
  updateUserRole: ["administrator"],
  deleteUser: ["administrator"],
  createOrder: ["administrator", "technician", "manager", "customer"],
  deleteOrder: ["administrator", "technician"],
} as const satisfies Record<Mutation["name"], Array<UserRole>>;
