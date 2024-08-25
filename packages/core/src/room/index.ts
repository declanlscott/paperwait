import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
import { rooms } from "./sql";

import type { Room } from "./sql";

export const metadata = async () =>
  useTransaction((tx) => {
    const { org, user } = useAuthenticated();

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
    }
  });

export const fromIds = async (ids: Array<Room["id"]>) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(rooms)
      .where(and(inArray(rooms.id, ids), eq(rooms.orgId, org.id)));
  });

export { roomSchema as schema } from "./schemas";
