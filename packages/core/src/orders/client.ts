import { mutationRbac } from "../replicache/shared";
import { Users } from "../users/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { enforceRbac, rbacErrorMessage } from "../utils/shared";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  ordersTableName,
  updateOrderMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Order } from "./sql";

export namespace Orders {
  export const create = Utils.optimisticMutator(
    createOrderMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.createOrder, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "create order mutator")],
      }),
    () => async (tx, values) =>
      tx.set(`${ordersTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateOrderMutationArgsSchema,
    async (user, tx, values) => {
      const users = await Users.withOrderAccess(tx, values.id);

      if (
        users.some((u) => u.id === user.id) ||
        enforceRbac(user, mutationRbac.updateOrder, {
          Error: ApplicationError.AccessDenied,
          args: [rbacErrorMessage(user, "update order mutator")],
        })
      )
        return true;

      throw new ApplicationError.AccessDenied();
    },
    () => async (tx, values) => {
      const prev = await tx.get<Order>(`${ordersTableName}/${values.id}`);
      if (!prev)
        throw new ApplicationError.EntityNotFound(ordersTableName, values.id);

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Order>;

      return tx.set(`${ordersTableName}/${values.id}`, next);
    },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteOrderMutationArgsSchema,
    async (user, tx, { id }) => {
      const users = await Users.withOrderAccess(tx, id);

      if (
        users.some((u) => u.id === user.id) ||
        enforceRbac(user, mutationRbac.deleteOrder, {
          Error: ApplicationError.AccessDenied,
          args: [rbacErrorMessage(user, "delete order mutator")],
        })
      )
        return true;

      throw new ApplicationError.AccessDenied();
    },
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<Order>(`${ordersTableName}/${id}`);
          if (!prev)
            throw new ApplicationError.EntityNotFound(ordersTableName, id);

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Order>;

          return tx.set(`${ordersTableName}/${id}`, next);
        }

        const success = await tx.del(`${ordersTableName}/${id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound(ordersTableName, id);
      },
  );
}
