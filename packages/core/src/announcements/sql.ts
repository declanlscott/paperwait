import { foreignKey, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { roomsTable } from "../rooms/sql";
import { announcementsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm/table";

export const announcementsTable = orgTable(
  announcementsTableName,
  {
    content: text("content").notNull(),
    roomId: id("room_id").notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [roomsTable.id, roomsTable.orgId],
      name: "room_fk",
    }),
  }),
);

export type AnnouncementsTable = typeof announcementsTable;

export type Announcement = InferSelectModel<AnnouncementsTable>;
