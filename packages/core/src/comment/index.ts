import { and, arrayOverlaps, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
import { orders } from "../order/sql";
import {
  papercutAccountManagerAuthorizations,
  papercutAccounts,
} from "../papercut/sql";
import { comments } from "./sql";

import type { Comment } from "./sql";

export const metadata = async () =>
  useTransaction((tx) => {
    const { org, user } = useAuthenticated();

    const baseQuery = tx
      .select({
        id: comments.id,
        rowVersion: sql<number>`"${comments._.name}"."${ROW_VERSION_COLUMN_NAME}`,
      })
      .from(comments)
      .where(eq(comments.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(
          and(
            arrayOverlaps(comments.visibleTo, [
              "operator",
              "manager",
              "customer",
            ]),
            isNull(comments.deletedAt),
          ),
        );
      case "manager":
        return baseQuery
          .innerJoin(
            orders,
            and(
              eq(comments.orderId, orders.id),
              eq(comments.orgId, orders.orgId),
            ),
          )
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
          .where(
            and(
              arrayOverlaps(comments.visibleTo, ["manager", "customer"]),
              isNull(comments.deletedAt),
            ),
          );
      case "customer":
        return baseQuery
          .innerJoin(
            orders,
            and(
              eq(comments.orderId, orders.id),
              eq(comments.orgId, orders.orgId),
            ),
          )
          .where(
            and(
              eq(orders.customerId, user.id),
              arrayOverlaps(comments.visibleTo, ["customer"]),
              isNull(comments.deletedAt),
            ),
          );
      default: {
        user.role satisfies never;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unexpected user role: ${user.role}`);
      }
    }
  });

export const fromIds = async (ids: Array<Comment["id"]>) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(comments)
      .where(and(inArray(comments.id, ids), eq(comments.orgId, org.id)));
  });

export { commentSchema as schema } from "./schemas";
