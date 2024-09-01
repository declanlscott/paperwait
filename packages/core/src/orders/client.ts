import { enforceRbac, mutationRbac } from "../auth/rbac";
import {
  AccessDeniedError,
  EntityNotFoundError,
  InvalidUserRoleError,
} from "../errors/application";
import * as Users from "../users/client";
import { optimisticMutator } from "../utils/helpers";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  ordersTableName,
  updateOrderMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Order } from "./sql";

export const create = optimisticMutator(
  createOrderMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.createOrder, InvalidUserRoleError),
  () => async (tx, values) => tx.set(`${ordersTableName}/${values.id}`, values),
);

export const update = optimisticMutator(
  updateOrderMutationArgsSchema,
  async (user, tx, values) => {
    const users = await Users.withOrderAccess(tx, values.id);

    if (
      users.some((u) => u.id === user.id) ||
      enforceRbac(user, mutationRbac.updateOrder, InvalidUserRoleError)
    )
      return true;

    throw new AccessDeniedError();
  },
  () => async (tx, values) => {
    const prev = await tx.get<Order>(`${ordersTableName}/${values.id}`);
    if (!prev) throw new EntityNotFoundError(ordersTableName, values.id);

    const next = {
      ...prev,
      ...values,
    } satisfies DeepReadonlyObject<Order>;

    return tx.set(`${ordersTableName}/${values.id}`, next);
  },
);

export const delete_ = optimisticMutator(
  deleteOrderMutationArgsSchema,
  async (user, tx, { id }) => {
    const users = await Users.withOrderAccess(tx, id);

    if (
      users.some((u) => u.id === user.id) ||
      enforceRbac(user, mutationRbac.deleteOrder, InvalidUserRoleError)
    )
      return true;

    throw new AccessDeniedError();
  },
  ({ user }) =>
    async (tx, { id, ...values }) => {
      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<Order>(`${ordersTableName}/${id}`);
        if (!prev) throw new EntityNotFoundError(ordersTableName, id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Order>;

        return tx.set(`${ordersTableName}/${id}`, next);
      }

      const success = await tx.del(`${ordersTableName}/${id}`);
      if (!success) throw new EntityNotFoundError(ordersTableName, id);
    },
);

export { orderSchema as schema } from "./shared";
