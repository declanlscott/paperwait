import { enforceRbac, mutationRbac } from "../auth/rbac";
import {
  EntityNotFoundError,
  InvalidUserRoleError,
} from "../errors/application";
import { optimisticMutator } from "../utils/helpers";
import {
  createProductMutationArgsSchema,
  deleteProductMutationArgsSchema,
  productsTableName,
  updateProductMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Product } from "./sql";

export const create = optimisticMutator(
  createProductMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.createProduct, InvalidUserRoleError),
  () => async (tx, values) =>
    tx.set(`${productsTableName}/${values.id}`, values),
);

export const update = optimisticMutator(
  updateProductMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.updateProduct, InvalidUserRoleError),
  () =>
    async (tx, { id, ...values }) => {
      const prev = await tx.get<Product>(`${productsTableName}/${id}`);
      if (!prev) throw new EntityNotFoundError(productsTableName, id);

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Product>;

      return tx.set(`${productsTableName}/${id}`, next);
    },
);

export const delete_ = optimisticMutator(
  deleteProductMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.deleteProduct, InvalidUserRoleError),
  ({ user }) =>
    async (tx, values) => {
      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<Product>(`${productsTableName}/${values.id}`);
        if (!prev) throw new EntityNotFoundError(productsTableName, values.id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Product>;

        return tx.set(`${productsTableName}/${values.id}`, next);
      }

      const success = await tx.del(`${productsTableName}/${values.id}`);
      if (!success) throw new EntityNotFoundError(productsTableName, values.id);
    },
);
