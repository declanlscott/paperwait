import { AccessControl } from "../access-control/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
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
    (tx, user, { papercutAccountId }) =>
      AccessControl.enforce(
        [tx, user, ordersTableName, "create", papercutAccountId],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: ordersTableName }],
        },
      ),
    () => async (tx, values) =>
      tx.set(`${ordersTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateOrderMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, ordersTableName, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await tx.get<Order>(`${ordersTableName}/${values.id}`);
      if (!prev)
        throw new ApplicationError.EntityNotFound({
          name: ordersTableName,
          id: values.id,
        });

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Order>;

      return tx.set(`${ordersTableName}/${values.id}`, next);
    },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteOrderMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, ordersTableName, "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (user.profile.role === "administrator") {
          const prev = await tx.get<Order>(`${ordersTableName}/${id}`);
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: ordersTableName,
              id,
            });

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Order>;

          return tx.set(`${ordersTableName}/${id}`, next);
        }

        const success = await tx.del(`${ordersTableName}/${id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: ordersTableName,
            id,
          });
      },
  );
}
