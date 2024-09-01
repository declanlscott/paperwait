import { enforceRbac, mutationRbac } from "../auth/rbac";
import {
  EntityNotFoundError,
  InvalidUserRoleError,
} from "../errors/application";
import { productsTableName } from "../products/shared";
import { optimisticMutator } from "../utils/helpers";
import {
  createRoomMutationArgsSchema,
  deleteRoomMutationArgsSchema,
  restoreRoomMutationArgsSchema,
  roomsTableName,
  updateRoomMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Product } from "../products/sql";
import type { Room } from "./sql";

export const create = optimisticMutator(
  createRoomMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.createRoom, InvalidUserRoleError),
  () => async (tx, values) => tx.set(`${roomsTableName}/${values.id}`, values),
);

export const update = optimisticMutator(
  updateRoomMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.updateRoom, InvalidUserRoleError),
  () =>
    async (tx, { id, ...values }) => {
      const prev = await tx.get<Room>(`${roomsTableName}/${id}`);
      if (!prev) throw new EntityNotFoundError(roomsTableName, id);

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Room>;

      return tx.set(`${roomsTableName}/${id}`, next);
    },
);

export const delete_ = optimisticMutator(
  deleteRoomMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.deleteRoom, InvalidUserRoleError),
  ({ user }) =>
    async (tx, { id, ...values }) => {
      // Set all products in the room to draft
      const products = await tx
        .scan<Product>({ prefix: `${productsTableName}/` })
        .toArray()
        .then((products) => products.filter((p) => p.roomId === id));
      await Promise.all(
        products.map(async (p) => {
          const prev = await tx.get<Product>(`${productsTableName}/${p.id}`);
          if (!prev) throw new EntityNotFoundError(productsTableName, p.id);

          const next = {
            ...prev,
            status: "draft",
          } satisfies DeepReadonlyObject<Product>;

          return tx.set(`${productsTableName}/${p.id}`, next);
        }),
      );

      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<Room>(`${roomsTableName}/${id}`);
        if (!prev) throw new EntityNotFoundError(roomsTableName, id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Room>;

        return tx.set(`${roomsTableName}/${id}`, next);
      }

      const success = await tx.del(`${roomsTableName}/${id}`);
      if (!success) throw new EntityNotFoundError(roomsTableName, id);
    },
);

export const restore = optimisticMutator(
  restoreRoomMutationArgsSchema,
  (user) => enforceRbac(user, mutationRbac.restoreRoom, InvalidUserRoleError),
  () => async (tx, values) => {
    const prev = await tx.get<Room>(`${roomsTableName}/${values.id}`);
    if (!prev) throw new EntityNotFoundError(roomsTableName, values.id);

    const next = {
      ...prev,
      deletedAt: null,
    } satisfies DeepReadonlyObject<Room>;

    return tx.set(`${roomsTableName}/${values.id}`, next);
  },
);

export { roomSchema as schema } from "./shared";
