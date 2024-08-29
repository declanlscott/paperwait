import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as R from "remeda";

import * as Auth from "../auth";
import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import { NonExhaustiveValueError } from "../errors/misc";
import { orders } from "../order/sql";
import {
  papercutAccountManagerAuthorizations,
  papercutAccounts,
} from "../papercut/sql";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import { fn } from "../utils/helpers";
import {
  deleteUserMutationArgsSchema,
  restoreUserMutationArgsSchema,
  updateUserRoleMutationArgsSchema,
} from "./shared";
import { users } from "./sql";

import type { Order } from "../order/sql";
import type { UserRole } from "./shared";
import type { User } from "./sql";

export async function metadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: users.id,
        rowVersion: sql<number>`"${users._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(users)
      .where(eq(users.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(isNull(users.deletedAt));
      case "manager":
        return baseQuery.where(isNull(users.deletedAt));
      case "customer":
        return baseQuery.where(isNull(users.deletedAt));
      default:
        throw new NonExhaustiveValueError(user.role);
    }
  });
}

export const fromIds = async (ids: Array<User["id"]>) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(users)
      .where(and(inArray(users.id, ids), eq(users.orgId, org.id)));
  });

export const fromRoles = async (
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(inArray(users.role, roles), eq(users.orgId, org.id)));
  });

export const withOrderAccess = async (orderId: Order["id"]) =>
  useTransaction(async (tx) => {
    const { org } = useAuthenticated();

    const [adminsOps, managers, [customer]] = await Promise.all([
      fromRoles(["administrator", "operator"]),
      tx
        .select({ id: users.id })
        .from(users)
        .innerJoin(
          papercutAccountManagerAuthorizations,
          and(
            eq(users.id, papercutAccountManagerAuthorizations.managerId),
            eq(users.orgId, papercutAccountManagerAuthorizations.orgId),
          ),
        )
        .innerJoin(
          orders,
          and(
            eq(
              papercutAccountManagerAuthorizations.papercutAccountId,
              orders.papercutAccountId,
            ),
            eq(papercutAccounts.orgId, org.id),
          ),
        )
        .where(and(eq(orders.id, orderId), eq(orders.orgId, org.id))),
      tx
        .select({ id: users.id })
        .from(users)
        .innerJoin(orders, eq(users.id, orders.customerId))
        .where(and(eq(orders.id, orderId), eq(orders.orgId, org.id))),
    ]);

    return R.uniqueBy([...adminsOps, ...managers, customer], ({ id }) => id);
  });

export const updateRole = fn(
  updateUserRoleMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateUserRole, ForbiddenError);

    return useTransaction(async (tx) => {
      await tx
        .update(users)
        .set(values)
        .where(and(eq(users.id, id), eq(users.orgId, org.id)));

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

    const isRoleAuthorized = enforceRbac(user, mutationRbac.deleteUser);
    if (!isRoleAuthorized && user.id !== id) throw new ForbiddenError();

    return useTransaction(async (tx) => {
      await tx
        .update(users)
        .set(values)
        .where(and(eq(users.id, id), eq(users.orgId, org.id)));

      await afterTransaction(() =>
        Promise.all([
          Auth.invalidateUserSessions(id),
          Replicache.poke([Realtime.formatChannel("org", org.id)]),
        ]),
      );
    });
  },
);

export const restore = fn(restoreUserMutationArgsSchema, async ({ id }) => {
  const { org } = useAuthenticated();

  return useTransaction(async (tx) => {
    await tx
      .update(users)
      .set({ deletedAt: null })
      .where(and(eq(users.id, id), eq(users.orgId, org.id)));

    await afterTransaction(() =>
      Replicache.poke([Realtime.formatChannel("org", org.id)]),
    );
  });
});

export { userSchema as schema } from "./shared";
