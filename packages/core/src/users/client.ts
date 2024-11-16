import * as R from "remeda";

import { AccessControl } from "../access-control/client";
import { ordersTableName } from "../orders/shared";
import { papercutAccountManagerAuthorizationsTableName } from "../papercut/shared";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
  usersTableName,
} from "./shared";

import type { DeepReadonlyObject, WriteTransaction } from "replicache";
import type { Order } from "../orders/sql";
import type {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/sql";
import type { UserRole } from "./shared";
import type { UserWithProfile } from "./sql";

export namespace Users {
  export const fromRoles = async (
    tx: WriteTransaction,
    roles: Array<UserRole> = [
      "administrator",
      "operator",
      "manager",
      "customer",
    ],
  ) =>
    tx
      .scan<UserWithProfile>({ prefix: `${usersTableName}/` })
      .toArray()
      .then((users) =>
        users.filter((user) => roles.includes(user.profile.role)),
      );

  export async function withOrderAccess(
    tx: WriteTransaction,
    orderId: Order["id"],
  ) {
    const order = await tx.get<Order>(`${ordersTableName}/${orderId}`);
    if (!order)
      throw new ApplicationError.EntityNotFound({
        name: ordersTableName,
        id: orderId,
      });

    const [adminsOps, managers, customer] = await Promise.all([
      fromRoles(tx, ["administrator", "operator"]),
      withManagerAuthorization(tx, order.papercutAccountId),
      tx.get<UserWithProfile>(`${usersTableName}/${order.customerId}`),
    ]);

    return R.uniqueBy(
      [...adminsOps, ...managers, customer].filter(Boolean),
      R.prop("id"),
    );
  }

  export const withManagerAuthorization = async (
    tx: WriteTransaction,
    accountId: PapercutAccount["id"],
  ) =>
    R.pipe(
      await tx
        .scan<PapercutAccountManagerAuthorization>({
          prefix: `${papercutAccountManagerAuthorizationsTableName}/`,
        })
        .toArray(),
      R.filter(({ papercutAccountId }) => papercutAccountId === accountId),
      async (authorizations) =>
        Promise.all(
          authorizations.map(({ managerId }) =>
            tx.get<UserWithProfile>(`${usersTableName}/${managerId}`),
          ),
        ).then((users) => users.filter(Boolean)),
    );

  export const withCustomerAuthorization = async (
    tx: WriteTransaction,
    accountId: PapercutAccount["id"],
  ) =>
    R.pipe(
      await tx
        .scan<PapercutAccountCustomerAuthorization>({
          prefix: `${papercutAccountManagerAuthorizationsTableName}/`,
        })
        .toArray(),
      R.filter(({ papercutAccountId }) => papercutAccountId === accountId),
      async (authorizations) =>
        Promise.all(
          authorizations.map(({ customerId }) =>
            tx.get<UserWithProfile>(`${usersTableName}/${customerId}`),
          ),
        ).then((users) => users.filter(Boolean)),
    );

  export const updateProfileRole = Utils.optimisticMutator(
    updateUserProfileRoleMutationArgsSchema,
    (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await tx.get<UserWithProfile>(`${usersTableName}/${id}`);
        if (!prev)
          throw new ApplicationError.EntityNotFound({
            name: usersTableName,
            id,
          });

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

  export const deleteProfile = Utils.optimisticMutator(
    deleteUserProfileMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        // Soft delete for administrators
        if (user.profile.role === "administrator") {
          const prev = await tx.get<UserWithProfile>(`${usersTableName}/${id}`);
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: usersTableName,
              id,
            });

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
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: usersTableName,
            id,
          });
      },
  );

  export const restoreProfile = Utils.optimisticMutator(
    restoreUserProfileMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    () =>
      async (tx, { id }) => {
        const prev = await tx.get<UserWithProfile>(`${usersTableName}/${id}`);
        if (!prev)
          throw new ApplicationError.EntityNotFound({
            name: usersTableName,
            id,
          });

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
}
