import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import { NonExhaustiveValueError } from "../errors/misc";
import { products } from "../product/sql";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import { fn } from "../utils/helpers";
import {
  createRoomMutationArgsSchema,
  deleteRoomMutationArgsSchema,
  restoreRoomMutationArgsSchema,
  updateRoomMutationArgsSchema,
} from "./shared";
import { rooms } from "./sql";

import type { Room } from "./sql";

export const create = fn(createRoomMutationArgsSchema, async (values) => {
  const { user, org } = useAuthenticated();

  enforceRbac(user, mutationRbac.createRoom, ForbiddenError);

  return useTransaction(async (tx) => {
    const room = await tx
      .insert(rooms)
      .values(values)
      .returning({ id: rooms.id })
      .then((rows) => rows.at(0));
    if (!room) throw new Error("Failed to insert room");

    await afterTransaction(() =>
      Replicache.poke([Realtime.formatChannel("org", org.id)]),
    );

    return { room };
  });
});

export async function metadata() {
  const { user, org } = useAuthenticated();

  return useTransaction(async (tx) => {
    const baseQuery = tx
      .select({
        id: rooms.id,
        rowVersion: sql<number>`"${rooms._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(rooms)
      .where(eq(rooms.orgId, org.id))
      .$dynamic();

    switch (user.role) {
      case "administrator":
        return baseQuery;
      case "operator":
        return baseQuery.where(isNull(rooms.deletedAt));
      case "manager":
        return baseQuery.where(
          and(eq(rooms.status, "published"), isNull(rooms.deletedAt)),
        );
      case "customer":
        return baseQuery.where(
          and(eq(rooms.status, "published"), isNull(rooms.deletedAt)),
        );
      default:
        throw new NonExhaustiveValueError(user.role);
    }
  });
}

export async function fromIds(ids: Array<Room["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(rooms)
      .where(and(inArray(rooms.id, ids), eq(rooms.orgId, org.id))),
  );
}

export const update = fn(
  updateRoomMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateRoom, ForbiddenError);

    return useTransaction(async (tx) => {
      await tx
        .update(rooms)
        .set(values)
        .where(and(eq(rooms.id, id), eq(rooms.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export const delete_ = fn(
  deleteRoomMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.deleteRoom, ForbiddenError);

    return useTransaction(async (tx) => {
      await Promise.all([
        tx
          .update(rooms)
          .set({ ...values, status: "draft" })
          .where(and(eq(rooms.id, id), eq(rooms.orgId, org.id))),
        // Set all products in the room to draft
        tx
          .update(products)
          .set({ status: "draft" })
          .where(and(eq(products.roomId, id), eq(products.orgId, org.id))),
      ]);

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export const restore = fn(restoreRoomMutationArgsSchema, async ({ id }) => {
  const { user, org } = useAuthenticated();

  enforceRbac(user, mutationRbac.restoreRoom, ForbiddenError);

  return useTransaction(async (tx) => {
    await tx
      .update(rooms)
      .set({ deletedAt: null })
      .where(and(eq(rooms.id, id), eq(rooms.orgId, org.id)));

    await afterTransaction(() =>
      Replicache.poke([Realtime.formatChannel("org", org.id)]),
    );
  });
});

export { roomSchema as schema } from "./shared";
