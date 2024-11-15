import { and, eq, inArray } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { Permissions } from "../permissions";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { useAuthenticated } from "../sessions/context";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createProductMutationArgsSchema,
  deleteProductMutationArgsSchema,
  updateProductMutationArgsSchema,
} from "./shared";
import { productsTable } from "./sql";

import type { Product } from "./sql";

export namespace Products {
  export const create = fn(createProductMutationArgsSchema, async (values) => {
    const hasAccess = await Permissions.hasAccess(
      productsTable._.name,
      "create",
    );
    if (!hasAccess)
      throw new ApplicationError.AccessDenied({
        name: productsTable._.name,
      });

    return useTransaction(async (tx) => {
      await tx.insert(productsTable).values(values);

      await afterTransaction(() =>
        Replicache.poke([
          Realtime.formatChannel("tenant", useAuthenticated().tenant.id),
        ]),
      );
    });
  });

  export const read = async (ids: Array<Product["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(productsTable)
        .where(
          and(
            inArray(productsTable.id, ids),
            eq(productsTable.tenantId, useAuthenticated().tenant.id),
          ),
        ),
    );

  export const update = fn(
    updateProductMutationArgsSchema,
    async ({ id, ...values }) => {
      const { tenant } = useAuthenticated();

      const hasAccess = await Permissions.hasAccess(
        productsTable._.name,
        "update",
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: productsTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        await tx
          .update(productsTable)
          .set(values)
          .where(
            and(
              eq(productsTable.id, id),
              eq(productsTable.tenantId, tenant.id),
            ),
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
      const { tenant } = useAuthenticated();

      const hasAccess = await Permissions.hasAccess(
        productsTable._.name,
        "delete",
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: productsTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        await tx
          .update(productsTable)
          .set(values)
          .where(
            and(
              eq(productsTable.id, id),
              eq(productsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
