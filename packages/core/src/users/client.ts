import * as R from "remeda";

import { AccessControl } from "../access-control/client";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
} from "../billing-accounts/shared";
import { ordersTableName } from "../orders/shared";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
  usersTableName,
} from "./shared";

import type { WriteTransaction } from "replicache";
import type { BillingAccount } from "../billing-accounts/sql";
import type { Order } from "../orders/sql";
import type { UserRole } from "./shared";

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
    Replicache.scan(tx, usersTableName).then(
      R.filter((user) => roles.includes(user.profile.role)),
    );

  export async function withOrderAccess(
    tx: WriteTransaction,
    orderId: Order["id"],
  ) {
    const order = await Replicache.get(tx, ordersTableName, orderId);

    const [adminsOps, managers, customer] = await Promise.all([
      fromRoles(tx, ["administrator", "operator"]),
      withManagerAuthorization(tx, order.billingAccountId),
      Replicache.get(tx, usersTableName, order.customerId),
    ]);

    return R.uniqueBy(
      [...adminsOps, ...managers, customer].filter(Boolean),
      R.prop("id"),
    );
  }

  export const withManagerAuthorization = async (
    tx: WriteTransaction,
    accountId: BillingAccount["id"],
  ) =>
    R.pipe(
      await Replicache.scan(tx, billingAccountManagerAuthorizationsTableName),
      R.filter(({ billingAccountId }) => billingAccountId === accountId),
      async (authorizations) =>
        Promise.all(
          authorizations.map(({ managerId }) =>
            Replicache.get(tx, usersTableName, managerId),
          ),
        ).then((users) => users.filter(Boolean)),
    );

  export const withCustomerAuthorization = async (
    tx: WriteTransaction,
    accountId: BillingAccount["id"],
  ) =>
    R.pipe(
      await Replicache.scan(tx, billingAccountCustomerAuthorizationsTableName),
      R.filter(({ billingAccountId }) => billingAccountId === accountId),
      async (authorizations) =>
        Promise.all(
          authorizations.map(({ customerId }) =>
            Replicache.get(tx, usersTableName, customerId),
          ),
        ).then((users) => users.filter(Boolean)),
    );

  export const updateProfileRole = Replicache.optimisticMutator(
    updateUserProfileRoleMutationArgsSchema,
    (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await Replicache.get(tx, usersTableName, id);

        return Replicache.set(tx, usersTableName, id, {
          ...prev,
          profile: { ...prev.profile, ...values },
        });
      },
  );

  export const deleteProfile = Replicache.optimisticMutator(
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
          const prev = await Replicache.get(tx, usersTableName, id);

          return Replicache.set(tx, usersTableName, id, {
            ...prev,
            profile: { ...prev.profile, ...values },
          });
        }

        await Replicache.del(tx, usersTableName, id);
      },
  );

  export const restoreProfile = Replicache.optimisticMutator(
    restoreUserProfileMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    () =>
      async (tx, { id }) => {
        const prev = await Replicache.get(tx, usersTableName, id);

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
