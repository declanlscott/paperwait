import { foreignKey, text } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { NanoId } from "../id";
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

export const AnnouncementSchema = v.object({
  id: NanoId,
  orgId: NanoId,
  context: v.string(),
  roomId: NanoId,
  createdAt: v.pipe(v.string(), v.isoDateTime()),
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
  deletedAt: v.nullable(v.pipe(v.string(), v.isoDateTime())),
});
