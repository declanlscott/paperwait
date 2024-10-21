import { productsTableName } from "../products/shared";
import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { enforceRbac, rbacErrorMessage } from "../utils/shared";
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

export namespace Rooms {
  export const create = Utils.optimisticMutator(
    createRoomMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.createRoom, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "create room mutator")],
      }),
    () => async (tx, values) =>
      tx.set(`${roomsTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateRoomMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.updateRoom, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "update room mutator")],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await tx.get<Room>(`${roomsTableName}/${id}`);
        if (!prev)
          throw new ApplicationError.EntityNotFound(roomsTableName, id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Room>;

        return tx.set(`${roomsTableName}/${id}`, next);
      },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteRoomMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.deleteRoom, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "delete room mutator")],
      }),
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
            if (!prev)
              throw new ApplicationError.EntityNotFound(
                productsTableName,
                p.id,
              );

            const next = {
              ...prev,
              status: "draft",
            } satisfies DeepReadonlyObject<Product>;

            return tx.set(`${productsTableName}/${p.id}`, next);
          }),
        );

        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<Room>(`${roomsTableName}/${id}`);
          if (!prev)
            throw new ApplicationError.EntityNotFound(roomsTableName, id);

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Room>;

          return tx.set(`${roomsTableName}/${id}`, next);
        }

        const success = await tx.del(`${roomsTableName}/${id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound(roomsTableName, id);
      },
  );

  export const restore = Utils.optimisticMutator(
    restoreRoomMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.restoreRoom, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "restore room mutator")],
      }),
    () => async (tx, values) => {
      const prev = await tx.get<Room>(`${roomsTableName}/${values.id}`);
      if (!prev)
        throw new ApplicationError.EntityNotFound(roomsTableName, values.id);

      const next = {
        ...prev,
        deletedAt: null,
      } satisfies DeepReadonlyObject<Room>;

      return tx.set(`${roomsTableName}/${values.id}`, next);
    },
  );
}
