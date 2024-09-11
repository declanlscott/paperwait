import * as R from "remeda";

import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { AccessDenied, EntityNotFound } from "../errors/application";
import { ordersTableName } from "../orders/shared";
import { optimisticMutator } from "../utils/helpers";
import {
  deleteUserMutationArgsSchema,
  restoreUserMutationArgsSchema,
  updateUserRoleMutationArgsSchema,
  usersTableName,
} from "./shared";

import type { DeepReadonlyObject, WriteTransaction } from "replicache";
import type { Order } from "../orders/sql";
import type { PapercutAccountManagerAuthorization } from "../papercut/sql";
import type { UserRole } from "./shared";
import type { User } from "./sql";

export const fromRoles = async (
  tx: WriteTransaction,
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  tx
    .scan<User>({ prefix: `${usersTableName}/` })
    .toArray()
    .then((users) => users.filter((user) => roles.includes(user.role)));

export const withOrderAccess = async (
  tx: WriteTransaction,
  orderId: Order["id"],
) => {
  const order = await tx.get<Order>(`${ordersTableName}/${orderId}`);
  if (!order) throw new EntityNotFound(ordersTableName, orderId);

  const [adminsOps, managers, customer] = await Promise.all([
    fromRoles(tx, ["administrator", "operator"]),
    tx
      .scan<PapercutAccountManagerAuthorization>({
        prefix: "papercutAccountManagerAuthorization/",
      })
      .toArray()
      .then((papercutAccountManagerAuthorizations) =>
        papercutAccountManagerAuthorizations.filter(
          ({ papercutAccountId }) =>
            order.papercutAccountId === papercutAccountId,
        ),
      )
      .then((authorizations) =>
        Promise.all(
          authorizations.map(({ managerId }) =>
            tx.get<User>(`${usersTableName}/${managerId}`),
          ),
        ),
      ),
    tx.get<User>(`${usersTableName}/${order.customerId}`),
  ]);

  return R.uniqueBy(
    [...adminsOps, ...managers, customer].filter(Boolean),
    ({ id }) => id,
  );
};

export const updateRole = optimisticMutator(
  updateUserRoleMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.updateUserRole, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update user role mutator")],
    }),
  () =>
    async (tx, { id, ...values }) => {
      const prev = await tx.get<User>(`${usersTableName}/${id}`);
      if (!prev) throw new EntityNotFound(usersTableName, id);

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<User>;

      return tx.set(`${usersTableName}/${id}`, next);
    },
);

export const delete_ = optimisticMutator(
  deleteUserMutationArgsSchema,
  (user, _tx, { id }) =>
    id === user.id ||
    enforceRbac(user, mutationRbac.deleteUser, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "delete user mutator")],
    }),
  ({ user }) =>
    async (tx, { id, ...values }) => {
      // Soft delete for administrators
      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<User>(`${usersTableName}/${id}`);
        if (!prev) throw new EntityNotFound(usersTableName, id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<User>;

        return tx.set(`${usersTableName}/${id}`, next);
      }

      const success = await tx.del(`${usersTableName}/${id}`);
      if (!success) throw new EntityNotFound(usersTableName, id);
    },
);

export const restore = optimisticMutator(
  restoreUserMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.restoreUser, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "restore user mutator")],
    }),
  () =>
    async (tx, { id }) => {
      const prev = await tx.get<User>(`${usersTableName}/${id}`);
      if (!prev) throw new EntityNotFound(usersTableName, id);

      const next = {
        ...prev,
        deletedAt: null,
      } satisfies DeepReadonlyObject<User>;

      return tx.set(`${usersTableName}/${id}`, next);
    },
);

export { userSchema as schema } from "./shared";
