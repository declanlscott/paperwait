import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as R from "remeda";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
import {
  papercutAccountManagerAuthorizations,
  papercutAccounts,
} from "../papercut/sql";
import { orders } from "./sql";

import type { Order } from "./sql";

export const metadata = async () =>
  useTransaction(async (tx) => {
    const { org, user } = useAuthenticated();

    const baseQuery = tx
      .select({
        id: orders.id,
        rowVersion: sql<number>`"${orders._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(orders)
      .where(eq(orders.orgId, org.id))
      .$dynamic();

    const getCustomerOrders = async () =>
      baseQuery.where(eq(orders.customerId, user.id));

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(isNull(orders.deletedAt));
      case "manager": {
        const [customerOrders, managerOrders] = await Promise.all([
          getCustomerOrders(),
          baseQuery
            .innerJoin(
              papercutAccounts,
              and(
                eq(orders.papercutAccountId, papercutAccounts.id),
                eq(orders.orgId, papercutAccounts.orgId),
              ),
            )
            .innerJoin(
              papercutAccountManagerAuthorizations,
              and(
                eq(
                  papercutAccounts.id,
                  papercutAccountManagerAuthorizations.papercutAccountId,
                ),
                eq(
                  papercutAccounts.orgId,
                  papercutAccountManagerAuthorizations.orgId,
                ),
              ),
            )
            .where(isNull(orders.deletedAt)),
        ]);

        return R.uniqueBy(
          [...customerOrders, ...managerOrders],
          ({ id }) => id,
        );
      }
      case "customer":
        return getCustomerOrders();
      default: {
        user.role satisfies never;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unexpected user role: ${user.role}`);
      }
    }
  });

export const fromIds = async (ids: Array<Order["id"]>) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(orders)
      .where(and(inArray(orders.id, ids), eq(orders.orgId, org.id)));
  });

export { orderSchema as schema } from "./schemas";
