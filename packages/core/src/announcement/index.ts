import { and, eq, inArray, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
import { announcements } from "./sql";

import type { Announcement } from "./sql";

export const metadata = async () =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select({
        id: announcements.id,
        rowVersion: sql<number>`"${announcements._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(announcements)
      .where(eq(announcements.orgId, org.id));
  });

export const fromIds = async (ids: Array<Announcement["id"]>) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select()
      .from(announcements)
      .where(
        and(inArray(announcements.id, ids), eq(announcements.orgId, org.id)),
      );
  });

export { announcementSchema as schema } from "./schemas";
