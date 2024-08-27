import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
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
import { products } from "./sql";

import type { Product } from "./sql";

export const create = fn(createProductMutationArgsSchema, async (values) => {
  const { user, org } = useAuthenticated();

  enforceRbac(user, mutationRbac.createProduct, ForbiddenError);

  return useTransaction(async (tx) => {
    const product = await tx
      .insert(products)
      .values(values)
      .returning({ id: products.id })
      .then((rows) => rows.at(0));
    if (!product) throw new Error("Failed to insert product");

    await afterTransaction(() =>
      Replicache.poke([Realtime.formatChannel("org", org.id)]),
    );

    return { product };
  });
});

export async function metadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
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
      .from(products)
      .where(and(inArray(products.id, ids), eq(products.orgId, org.id))),
  );
}

export const update = fn(
  updateProductMutationArgsSchema,
  ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateProduct, ForbiddenError);

    return useTransaction(async (tx) => {
      await tx
        .update(products)
        .set(values)
        .where(and(eq(products.id, id), eq(products.orgId, org.id)));

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
        .update(products)
        .set(values)
        .where(and(eq(products.id, id), eq(products.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export { productSchema as schema } from "./shared";
