import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  ordersTableName,
  updateOrderMutationArgsSchema,
} from "./shared";

export namespace Orders {
  export const create = Replicache.optimisticMutator(
    createOrderMutationArgsSchema,
    (tx, user, { billingAccountId }) =>
      AccessControl.enforce(
        [tx, user, ordersTableName, "create", billingAccountId],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: ordersTableName }],
        },
      ),
    () => async (tx, values) =>
      Replicache.set(tx, ordersTableName, values.id, values),
  );

  export const update = Replicache.optimisticMutator(
    updateOrderMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, ordersTableName, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await Replicache.get(tx, ordersTableName, values.id);

      return Replicache.set(tx, ordersTableName, values.id, {
        ...prev,
        ...values,
      });
    },
  );

  export const delete_ = Replicache.optimisticMutator(
    deleteOrderMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, ordersTableName, "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (user.profile.role === "administrator") {
          const prev = await Replicache.get(tx, ordersTableName, id);

          return Replicache.set(tx, ordersTableName, id, {
            ...prev,
            ...values,
          });
        }

        await Replicache.del(tx, ordersTableName, id);
      },
  );
}
