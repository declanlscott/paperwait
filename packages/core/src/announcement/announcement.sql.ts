import { foreignKey, text } from "drizzle-orm/pg-core";

import { id } from "../orm/columns";
import { orgTable } from "../orm/tables";
import { Room } from "../room/room.sql";

export const Announcement = orgTable(
  "announcement",
  {
    content: text("content").notNull(),
    roomId: id("room_id").notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [Room.id, Room.orgId],
      name: "room_fk",
    }),
  }),
);

export type Announcement = typeof Announcement.$inferSelect;
