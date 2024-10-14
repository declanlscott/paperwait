import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import { NonExhaustiveValue } from "../errors/misc";
import { productsTable } from "../products/sql";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import { fn } from "../utils/shared";
import {
  createRoomMutationArgsSchema,
  deleteRoomMutationArgsSchema,
  restoreRoomMutationArgsSchema,
  updateRoomMutationArgsSchema,
} from "./shared";
import { roomsTable } from "./sql";

import type { Room } from "./sql";

export const create = fn(createRoomMutationArgsSchema, async (values) => {
  const { user, tenant } = useAuthenticated();

  enforceRbac(user, mutationRbac.createRoom, {
    Error: AccessDenied,
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
        rowVersion: sql<number>`"${roomsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
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
          and(eq(roomsTable.status, "published"), isNull(roomsTable.deletedAt)),
        );
      case "customer":
        return baseQuery.where(
          and(eq(roomsTable.status, "published"), isNull(roomsTable.deletedAt)),
        );
      default:
        throw new NonExhaustiveValue(user.profile.role);
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
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update room mutator")],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(roomsTable)
        .set(values)
        .where(and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)));

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
      Error: AccessDenied,
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
    Error: AccessDenied,
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

export { roomSchema as schema } from "./shared";
