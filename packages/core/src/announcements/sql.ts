import { foreignKey, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { roomsTable } from "../rooms/sql";
import { announcementsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm/table";

export const announcementsTable = tenantTable(
  announcementsTableName,
  {
    content: text("content").notNull(),
    roomId: id("room_id").notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.tenantId],
      foreignColumns: [roomsTable.id, roomsTable.tenantId],
      name: "room_fk",
    }),
  }),
);

export type AnnouncementsTable = typeof announcementsTable;

export type Announcement = InferSelectModel<AnnouncementsTable>;
