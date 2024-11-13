import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { enforceRbac } from "../utils/shared";
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
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTableName }],
      }),
    () => async (tx, values) =>
      tx.set(`${productsTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateProductMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.updateProduct, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await tx.get<Product>(`${productsTableName}/${id}`);
        if (!prev)
          throw new ApplicationError.EntityNotFound({
            name: productsTableName,
            id,
          });

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Product>;

        return tx.set(`${productsTableName}/${id}`, next);
      },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteProductMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.deleteProduct, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTableName, id }],
      }),
    ({ user }) =>
      async (tx, values) => {
        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<Product>(
            `${productsTableName}/${values.id}`,
          );
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: productsTableName,
              id: values.id,
            });

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Product>;

          return tx.set(`${productsTableName}/${values.id}`, next);
        }

        const success = await tx.del(`${productsTableName}/${values.id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: productsTableName,
            id: values.id,
          });
      },
  );
}
