import * as v from "valibot";

import {
  nanoIdSchema,
  orgTableSchema,
  papercutAccountIdSchema,
} from "../utils/schemas";

export const ordersTableName = "orders";

export const orderSchema = v.object({
  ...orgTableSchema.entries,
  customerId: nanoIdSchema,
  managerId: v.nullable(nanoIdSchema),
  operatorId: v.nullable(nanoIdSchema),
  productId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});

export const orderMutationNames = [
  "createOrder",
  "updateOrder",
  "deleteOrder",
] as const;

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
