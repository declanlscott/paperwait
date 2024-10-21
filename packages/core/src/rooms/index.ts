import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { productsTable } from "../products/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { useAuthenticated } from "../sessions/context";
import { Constants } from "../utils/constants";
import { ApplicationError, MiscellaneousError } from "../utils/errors";
import { enforceRbac, fn, rbacErrorMessage } from "../utils/shared";
import {
  createRoomMutationArgsSchema,
  deleteRoomMutationArgsSchema,
  restoreRoomMutationArgsSchema,
  updateRoomMutationArgsSchema,
} from "./shared";
import { roomsTable } from "./sql";

import type { Room } from "./sql";

export namespace Rooms {
  export const create = fn(createRoomMutationArgsSchema, async (values) => {
    const { user, tenant } = useAuthenticated();

    enforceRbac(user, mutationRbac.createRoom, {
      Error: ApplicationError.AccessDenied,
      args: [rbacErrorMessage(user, "create room mutator")],
    });

    return useTransaction(async (tx) => {
      await tx.insert(roomsTable).values(values);

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
          id: roomsTable.id,
          rowVersion: sql<number>`"${roomsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(roomsTable)
        .where(eq(roomsTable.tenantId, tenant.id))
        .$dynamic();

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "operator":
          return baseQuery.where(isNull(roomsTable.deletedAt));
        case "manager":
          return baseQuery.where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          );
        case "customer":
          return baseQuery.where(
            and(
              eq(roomsTable.status, "published"),
              isNull(roomsTable.deletedAt),
            ),
          );
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });
  }

  export async function fromIds(ids: Array<Room["id"]>) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
      tx
        .select()
        .from(roomsTable)
        .where(
          and(inArray(roomsTable.id, ids), eq(roomsTable.tenantId, tenant.id)),
        ),
    );
  }

  export const update = fn(
    updateRoomMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.updateRoom, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "update room mutator")],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(roomsTable)
          .set(values)
          .where(
            and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteRoomMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.deleteRoom, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "delete room mutator")],
      });

      return useTransaction(async (tx) => {
        await Promise.all([
          tx
            .update(roomsTable)
            .set({ ...values, status: "draft" })
            .where(
              and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)),
            ),
          // Set all products in the room to draft
          tx
            .update(productsTable)
            .set({ status: "draft" })
            .where(
              and(
                eq(productsTable.roomId, id),
                eq(productsTable.tenantId, tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export const restore = fn(restoreRoomMutationArgsSchema, async ({ id }) => {
    const { user, tenant } = useAuthenticated();

    enforceRbac(user, mutationRbac.restoreRoom, {
      Error: ApplicationError.AccessDenied,
      args: [rbacErrorMessage(user, "restore room mutator")],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(roomsTable)
        .set({ deletedAt: null })
        .where(and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
      );
    });
  });
}
