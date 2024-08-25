import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as R from "remeda";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
import { orders } from "../order/sql";
import {
  papercutAccountManagerAuthorizations,
  papercutAccounts,
} from "../papercut/sql";
import { users } from "./sql";

import type { UserRole } from "../constants/tuples";
import type { Order } from "../order/sql";
import type { User } from "./sql";

export const metadata = async () =>
  useTransaction((tx) => {
    const { org, user } = useAuthenticated();

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
      default: {
        user.role satisfies never;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unexpected user role: ${user.role}`);
      }
    }
  });

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

export { userSchema as schema } from "./schemas";
