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
import { fn } from "../utils/helpers";
import {
  deleteUserMutationArgsSchema,
  restoreUserMutationArgsSchema,
  updateUserRoleMutationArgsSchema,
} from "./shared";
import { usersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Order } from "../orders/sql";
import type { UserRole } from "./shared";
import type { User, UsersTable } from "./sql";

export const create = async (user: InferInsertModel<UsersTable>) =>
  useTransaction(async (tx) =>
    tx
      .insert(usersTable)
      .values(user)
      .returning({ id: usersTable.id })
      .then((rows) => rows.at(0)),
  );

export async function metadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: usersTable.id,
        rowVersion: sql<number>`"${usersTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(usersTable)
      .where(eq(usersTable.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(isNull(usersTable.deletedAt));
      case "manager":
        return baseQuery.where(isNull(usersTable.deletedAt));
      case "customer":
        return baseQuery.where(isNull(usersTable.deletedAt));
      default:
        throw new NonExhaustiveValue(user.role);
    }
  });
}

export async function fromIds(ids: Array<User["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(usersTable)
      .where(and(inArray(usersTable.id, ids), eq(usersTable.orgId, org.id))),
  );
}

export async function fromRoles(
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(
        and(inArray(usersTable.role, roles), eq(usersTable.orgId, org.id)),
      ),
  );
}

export async function withOrderAccess(orderId: Order["id"]) {
  const { org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const [adminsOps, managers, [customer]] = await Promise.all([
      fromRoles(["administrator", "operator"]),
      tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .innerJoin(
          papercutAccountManagerAuthorizationsTable,
          and(
            eq(
              usersTable.id,
              papercutAccountManagerAuthorizationsTable.managerId,
            ),
            eq(
              usersTable.orgId,
              papercutAccountManagerAuthorizationsTable.orgId,
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
            eq(papercutAccountsTable.orgId, org.id),
          ),
        )
        .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, org.id))),
      tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .innerJoin(ordersTable, eq(usersTable.id, ordersTable.customerId))
        .where(and(eq(ordersTable.id, orderId), eq(ordersTable.orgId, org.id))),
    ]);

    return R.uniqueBy([...adminsOps, ...managers, customer], ({ id }) => id);
  });
}

export async function exists(userId: User["id"]) {
  const { org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const rows = await tx
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.orgId, org.id)));

    return rows.length > 0;
  });
}

export const updateRole = fn(
  updateUserRoleMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateUserRole, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update user role mutator")],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(usersTable)
        .set(values)
        .where(and(eq(usersTable.id, id), eq(usersTable.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export const delete_ = fn(
  deleteUserMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    if (
      id === user.id ||
      enforceRbac(user, mutationRbac.deleteUser, {
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "delete user mutator")],
      })
    ) {
      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set(values)
          .where(and(eq(usersTable.id, id), eq(usersTable.orgId, org.id)));

        await afterTransaction(() =>
          Promise.all([
            Auth.invalidateUserSessions(id),
            Replicache.poke([Realtime.formatChannel("org", org.id)]),
          ]),
        );
      });
    }
  },
);

export const restore = fn(restoreUserMutationArgsSchema, async ({ id }) => {
  const { org } = useAuthenticated();

  return useTransaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ deletedAt: null })
      .where(and(eq(usersTable.id, id), eq(usersTable.orgId, org.id)));

    await afterTransaction(() =>
      Replicache.poke([Realtime.formatChannel("org", org.id)]),
    );
  });
});

export { userSchema as schema } from "./shared";
