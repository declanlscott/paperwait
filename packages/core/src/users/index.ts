import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as R from "remeda";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { Sessions } from "../sessions";
import { useAuthenticated } from "../sessions/context";
import { Constants } from "../utils/constants";
import { ApplicationError, MiscellaneousError } from "../utils/errors";
import { enforceRbac, fn, rbacErrorMessage } from "../utils/shared";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
} from "./shared";
import { userProfilesTable, usersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Order } from "../orders/sql";
import type { UserRole } from "./shared";
import type { User, UserProfilesTable } from "./sql";

export namespace Users {
  export const createProfile = async (
    profile: InferInsertModel<UserProfilesTable>,
  ) =>
    useTransaction(async (tx) =>
      tx
        .insert(userProfilesTable)
        .values(profile)
        .returning({ id: userProfilesTable.id })
        .then((rows) => rows.at(0)),
    );

  export async function metadata() {
    const { user, tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const baseQuery = tx
        .select({
          id: usersTable.id,
          rowVersion: sql<number>`"${userProfilesTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(eq(usersTable.tenantId, tenant.id), isNull(usersTable.deletedAt)),
        )
        .$dynamic();

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "operator":
          return baseQuery.where(isNull(userProfilesTable.deletedAt));
        case "manager":
          return baseQuery.where(isNull(userProfilesTable.deletedAt));
        case "customer":
          return baseQuery.where(isNull(userProfilesTable.deletedAt));
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });
  }

  export async function fromIds(ids: Array<User["id"]>) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
      tx
        .select({
          user: usersTable,
          profile: userProfilesTable,
        })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(inArray(usersTable.id, ids), eq(usersTable.tenantId, tenant.id)),
        )
        .then((rows) =>
          rows.map(({ user, profile }) => ({ ...user, profile })),
        ),
    );
  }

  export async function fromRoles(
    roles: Array<UserRole> = [
      "administrator",
      "operator",
      "manager",
      "customer",
    ],
  ) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
      tx
        .select({ id: usersTable.id, role: userProfilesTable.role })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(
            inArray(userProfilesTable.role, roles),
            eq(usersTable.tenantId, tenant.id),
          ),
        ),
    );
  }

  export async function withOrderAccess(orderId: Order["id"]) {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const [adminsOps, managers, [customer]] = await Promise.all([
        fromRoles(["administrator", "operator"]),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            userProfilesTable,
            and(
              eq(usersTable.id, userProfilesTable.userId),
              eq(usersTable.tenantId, userProfilesTable.tenantId),
            ),
          )
          .innerJoin(
            papercutAccountManagerAuthorizationsTable,
            and(
              eq(
                usersTable.id,
                papercutAccountManagerAuthorizationsTable.managerId,
              ),
              eq(
                usersTable.tenantId,
                papercutAccountManagerAuthorizationsTable.tenantId,
              ),
            ),
          )
          .innerJoin(
            ordersTable,
            and(
              eq(
                papercutAccountManagerAuthorizationsTable.papercutAccountId,
                ordersTable.papercutAccountId,
              ),
              eq(papercutAccountsTable.tenantId, tenant.id),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            userProfilesTable,
            and(
              eq(usersTable.id, userProfilesTable.userId),
              eq(usersTable.tenantId, userProfilesTable.tenantId),
            ),
          )
          .innerJoin(
            ordersTable,
            and(
              eq(usersTable.id, ordersTable.customerId),
              eq(usersTable.tenantId, ordersTable.tenantId),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
      ]);

      return R.uniqueBy([...adminsOps, ...managers, customer], ({ id }) => id);
    });
  }

  export async function exists(userId: User["id"]) {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(usersTable)
        .where(
          and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)),
        );

      return rows.length > 0;
    });
  }

  export const updateProfileRole = fn(
    updateUserProfileRoleMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.updateUserProfileRole, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "update user profile role mutator")],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(userProfilesTable)
          .set(values)
          .where(
            and(
              eq(userProfilesTable.id, id),
              eq(userProfilesTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export const deleteProfile = fn(
    deleteUserProfileMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      if (
        id === user.id ||
        enforceRbac(user, mutationRbac.deleteUserProfile, {
          Error: ApplicationError.AccessDenied,
          args: [rbacErrorMessage(user, "delete user profile mutator")],
        })
      ) {
        return useTransaction(async (tx) => {
          await tx
            .update(usersTable)
            .set(values)
            .where(
              and(eq(usersTable.id, id), eq(usersTable.tenantId, tenant.id)),
            );

          await afterTransaction(() =>
            Promise.all([
              Sessions.invalidateUser(id),
              Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
            ]),
          );
        });
      }
    },
  );

  export const restoreProfile = fn(
    restoreUserProfileMutationArgsSchema,
    async ({ id }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.restoreUserProfile, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "restore user profile mutator")],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ deletedAt: null })
          .where(
            and(eq(usersTable.id, id), eq(usersTable.tenantId, tenant.id)),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
