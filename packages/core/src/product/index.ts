import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
import { products } from "./sql";

import type { Product } from "./sql";

export const metadata = async () =>
  useTransaction((tx) => {
    const { org, user } = useAuthenticated();

    const baseQuery = tx
      .select({
        id: products.id,
        rowVersion: sql<number>`"${products._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(products)
      .where(eq(products.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(isNull(products.deletedAt));
      case "manager":
        return baseQuery.where(
          and(eq(products.status, "published"), isNull(products.deletedAt)),
        );
      case "customer":
        return baseQuery.where(
          and(eq(products.status, "published"), isNull(products.deletedAt)),
        );
      default: {
        user.role satisfies never;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unexpected user role: ${user.role}`);
      }
    }
  });

export const fromIds = async (ids: Array<Product["id"]>) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(products)
      .where(and(inArray(products.id, ids), eq(products.orgId, org.id)));
  });

export { productSchema as schema } from "./schemas";
