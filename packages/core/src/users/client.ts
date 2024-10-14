import * as R from "remeda";

import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { AccessDenied, EntityNotFound } from "../errors/application";
import { ordersTableName } from "../orders/shared";
import { optimisticMutator } from "../utils/client";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
  usersTableName,
} from "./shared";

import type { DeepReadonlyObject, WriteTransaction } from "replicache";
import type { Order } from "../orders/sql";
import type { PapercutAccountManagerAuthorization } from "../papercut/sql";
import type { UserRole } from "./shared";
import type { UserWithProfile } from "./sql";

export const fromRoles = async (
  tx: WriteTransaction,
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  tx
    .scan<UserWithProfile>({ prefix: `${usersTableName}/` })
    .toArray()
    .then((users) => users.filter((user) => roles.includes(user.profile.role)));

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
            tx.get<UserWithProfile>(`${usersTableName}/${managerId}`),
          ),
        ),
      ),
    tx.get<UserWithProfile>(`${usersTableName}/${order.customerId}`),
  ]);

  return R.uniqueBy(
    [...adminsOps, ...managers, customer].filter(Boolean),
    ({ id }) => id,
  );
};

export const updateProfileRole = optimisticMutator(
  updateUserProfileRoleMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.updateUserProfileRole, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update user profile role mutator")],
    }),
  () =>
    async (tx, { id, ...values }) => {
      const prev = await tx.get<UserWithProfile>(`${usersTableName}/${id}`);
      if (!prev) throw new EntityNotFound(usersTableName, id);

      const next = {
        ...prev,
        profile: {
          ...prev.profile,
          ...values,
        },
      } satisfies DeepReadonlyObject<UserWithProfile>;

      return tx.set(`${usersTableName}/${id}`, next);
    },
);

export const deleteProfile = optimisticMutator(
  deleteUserProfileMutationArgsSchema,
  (user, _tx, { id }) =>
    id === user.id ||
    enforceRbac(user, mutationRbac.deleteUserProfile, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "delete user profile mutator")],
    }),
  ({ user }) =>
    async (tx, { id, ...values }) => {
      // Soft delete for administrators
      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<UserWithProfile>(`${usersTableName}/${id}`);
        if (!prev) throw new EntityNotFound(usersTableName, id);

        const next = {
          ...prev,
          profile: {
            ...prev.profile,
            ...values,
          },
        } satisfies DeepReadonlyObject<UserWithProfile>;

        return tx.set(`${usersTableName}/${id}`, next);
      }

      const success = await tx.del(`${usersTableName}/${id}`);
      if (!success) throw new EntityNotFound(usersTableName, id);
    },
);

export const restoreProfile = optimisticMutator(
  restoreUserProfileMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.restoreUserProfile, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "restore user profile mutator")],
    }),
  () =>
    async (tx, { id }) => {
      const prev = await tx.get<UserWithProfile>(`${usersTableName}/${id}`);
      if (!prev) throw new EntityNotFound(usersTableName, id);

      const next = {
        ...prev,
        profile: {
          ...prev.profile,
          deletedAt: null,
        },
      } satisfies DeepReadonlyObject<UserWithProfile>;

      return tx.set(`${usersTableName}/${id}`, next);
    },
);

export { userSchema as schema } from "./shared";
