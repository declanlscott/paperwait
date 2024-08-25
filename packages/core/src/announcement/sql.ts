import { foreignKey, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { rooms } from "../room/sql";

export const announcements = orgTable(
  "announcements",
  {
    content: text("content").notNull(),
    roomId: id("room_id").notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [rooms.id, rooms.orgId],
      name: "room_fk",
    }),
  }),
);

export type Announcement = typeof announcements.$inferSelect;
