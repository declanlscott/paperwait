import { AccessDenied, EntityNotFound } from "../errors/application";
import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { enforceRbac, rbacErrorMessage } from "../utils/shared";
import {
  createProductMutationArgsSchema,
  deleteProductMutationArgsSchema,
  productsTableName,
  updateProductMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Product } from "./sql";

export namespace Products {
  export const create = Utils.optimisticMutator(
    createProductMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.createProduct, {
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "create product mutator")],
      }),
    () => async (tx, values) =>
      tx.set(`${productsTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateProductMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.updateProduct, {
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "update product mutator")],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await tx.get<Product>(`${productsTableName}/${id}`);
        if (!prev) throw new EntityNotFound(productsTableName, id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Product>;

        return tx.set(`${productsTableName}/${id}`, next);
      },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteProductMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.deleteProduct, {
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "delete product mutator")],
      }),
    ({ user }) =>
      async (tx, values) => {
        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<Product>(
            `${productsTableName}/${values.id}`,
          );
          if (!prev) throw new EntityNotFound(productsTableName, values.id);

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Product>;

          return tx.set(`${productsTableName}/${values.id}`, next);
        }

        const success = await tx.del(`${productsTableName}/${values.id}`);
        if (!success) throw new EntityNotFound(productsTableName, values.id);
      },
  );
}
