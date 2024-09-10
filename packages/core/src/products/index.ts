import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import { NonExhaustiveValueError } from "../errors/misc";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import { fn } from "../utils/helpers";
import {
  createProductMutationArgsSchema,
  deleteProductMutationArgsSchema,
  updateProductMutationArgsSchema,
} from "./shared";
import { productsTable } from "./sql";

import type { Product } from "./sql";

export const create = fn(createProductMutationArgsSchema, async (values) => {
  const { user, org } = useAuthenticated();

  enforceRbac(user, mutationRbac.createProduct, ForbiddenError);

  return useTransaction(async (tx) => {
    await tx.insert(productsTable).values(values);

    await afterTransaction(() =>
      Replicache.poke([Realtime.formatChannel("org", org.id)]),
    );
  });
});

export async function metadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: productsTable.id,
        rowVersion: sql<number>`"${productsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(productsTable)
      .where(eq(productsTable.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(isNull(productsTable.deletedAt));
      case "manager":
        return baseQuery.where(
          and(
            eq(productsTable.status, "published"),
            isNull(productsTable.deletedAt),
          ),
        );
      case "customer":
        return baseQuery.where(
          and(
            eq(productsTable.status, "published"),
            isNull(productsTable.deletedAt),
          ),
        );
      default:
        throw new NonExhaustiveValueError(user.role);
    }
  });
}

export async function fromIds(ids: Array<Product["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(productsTable)
      .where(
        and(inArray(productsTable.id, ids), eq(productsTable.orgId, org.id)),
      ),
  );
}

export const update = fn(
  updateProductMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateProduct, ForbiddenError);

    return useTransaction(async (tx) => {
      await tx
        .update(productsTable)
        .set(values)
        .where(and(eq(productsTable.id, id), eq(productsTable.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export const delete_ = fn(
  deleteProductMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.deleteProduct, ForbiddenError);

    return useTransaction(async (tx) => {
      await tx
        .update(productsTable)
        .set(values)
        .where(and(eq(productsTable.id, id), eq(productsTable.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export { productSchema as schema } from "./shared";
