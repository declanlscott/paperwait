import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  ordersTableName,
  updateOrderMutationArgsSchema,
} from "./shared";

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
      Replicache.set(tx, ordersTableName, values.id, values),
  );

  export const update = Utils.optimisticMutator(
    updateOrderMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, ordersTableName, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await Replicache.get<Order>(tx, ordersTableName, values.id);

      return Replicache.set(tx, ordersTableName, values.id, {
        ...prev,
        ...values,
      });
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
          const prev = await Replicache.get<Order>(tx, ordersTableName, id);

          return Replicache.set(tx, ordersTableName, id, {
            ...prev,
            ...values,
          });
        }

        await Replicache.del(tx, ordersTableName, id);
      },
  );
}
