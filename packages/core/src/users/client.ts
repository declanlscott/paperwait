import * as R from "remeda";

import { AccessControl } from "../access-control/client";
import { ordersTableName } from "../orders/shared";
import { papercutAccountManagerAuthorizationsTableName } from "../papercut/shared";
import { Replicache } from "../replicache/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
  usersTableName,
} from "./shared";

import type { WriteTransaction } from "replicache";
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
    Replicache.scan<UserWithProfile>(tx, usersTableName).then(
      R.filter((user) => roles.includes(user.profile.role)),
    );

  export async function withOrderAccess(
    tx: WriteTransaction,
    orderId: Order["id"],
  ) {
    const order = await Replicache.get<Order>(tx, ordersTableName, orderId);

    const [adminsOps, managers, customer] = await Promise.all([
      fromRoles(tx, ["administrator", "operator"]),
      withManagerAuthorization(tx, order.papercutAccountId),
      Replicache.get<UserWithProfile>(tx, usersTableName, order.customerId),
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
      await Replicache.scan<PapercutAccountManagerAuthorization>(
        tx,
        papercutAccountManagerAuthorizationsTableName,
      ),
      R.filter(({ papercutAccountId }) => papercutAccountId === accountId),
      async (authorizations) =>
        Promise.all(
          authorizations.map(({ managerId }) =>
            Replicache.get<UserWithProfile>(tx, usersTableName, managerId),
          ),
        ).then((users) => users.filter(Boolean)),
    );

  export const withCustomerAuthorization = async (
    tx: WriteTransaction,
    accountId: PapercutAccount["id"],
  ) =>
    R.pipe(
      await Replicache.scan<PapercutAccountCustomerAuthorization>(
        tx,
        papercutAccountManagerAuthorizationsTableName,
      ),
      R.filter(({ papercutAccountId }) => papercutAccountId === accountId),
      async (authorizations) =>
        Promise.all(
          authorizations.map(({ customerId }) =>
            Replicache.get<UserWithProfile>(tx, usersTableName, customerId),
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
        const prev = await Replicache.get<UserWithProfile>(
          tx,
          usersTableName,
          id,
        );

        return Replicache.set(tx, usersTableName, id, {
          ...prev,
          profile: { ...prev.profile, ...values },
        });
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
          const prev = await Replicache.get<UserWithProfile>(
            tx,
            usersTableName,
            id,
          );

          return Replicache.set(tx, usersTableName, id, {
            ...prev,
            profile: { ...prev.profile, ...values },
          });
        }

        await Replicache.del(tx, usersTableName, id);
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
        const prev = await Replicache.get<UserWithProfile>(
          tx,
          usersTableName,
          id,
        );

        return Replicache.set(tx, usersTableName, id, {
          ...prev,
          profile: {
            ...prev.profile,
            deletedAt: null,
          },
        });
      },
  );
}
