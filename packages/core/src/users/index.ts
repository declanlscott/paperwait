import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as R from "remeda";

import * as Auth from "../auth";
import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import { NonExhaustiveValue } from "../errors/misc";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import { fn } from "../utils/shared";
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
        rowVersion: sql<number>`"${userProfilesTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
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
        throw new NonExhaustiveValue(user.profile.role);
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
      .then((rows) => rows.map(({ user, profile }) => ({ ...user, profile }))),
  );
}

export async function fromRoles(
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
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
          and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenant.id)),
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
          and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, tenant.id)),
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
      Error: AccessDenied,
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
        Error: AccessDenied,
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
            Auth.invalidateUserSessions(id),
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
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "restore user profile mutator")],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({ deletedAt: null })
        .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, tenant.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
      );
    });
  },
);

export { userSchema as schema } from "./shared";
