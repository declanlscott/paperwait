import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import { NonExhaustiveValue } from "../errors/misc";
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
  const { user, tenant } = useAuthenticated();

  enforceRbac(user, mutationRbac.createProduct, {
    Error: AccessDenied,
    args: [rbacErrorMessage(user, "create product mutator")],
  });

  return useTransaction(async (tx) => {
    await tx.insert(productsTable).values(values);

    await afterTransaction(() =>
      Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
    );
  });
});

export async function metadata() {
  const { user, tenant } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: productsTable.id,
        rowVersion: sql<number>`"${productsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(productsTable)
      .where(eq(productsTable.tenantId, tenant.id))
      .$dynamic();

    switch (user.profile.role) {
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
        throw new NonExhaustiveValue(user.profile.role);
    }
  });
}

export async function fromIds(ids: Array<Product["id"]>) {
  const { tenant } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(productsTable)
      .where(
        and(
          inArray(productsTable.id, ids),
          eq(productsTable.tenantId, tenant.id),
        ),
      ),
  );
}

export const update = fn(
  updateProductMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, tenant } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateProduct, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update product mutator")],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(productsTable)
        .set(values)
        .where(
          and(eq(productsTable.id, id), eq(productsTable.tenantId, tenant.id)),
        );

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
      );
    });
  },
);

export const delete_ = fn(
  deleteProductMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, tenant } = useAuthenticated();

    enforceRbac(user, mutationRbac.deleteProduct, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "delete product mutator")],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(productsTable)
        .set(values)
        .where(
          and(eq(productsTable.id, id), eq(productsTable.tenantId, tenant.id)),
        );

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
      );
    });
  },
);

export { productSchema as schema } from "./shared";
