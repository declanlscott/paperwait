import { index, pgEnum, text, unique } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { orgTable, OrgTableSchema } from "../drizzle/tables";

export const RoomStatus = pgEnum("room_status", ["draft", "published"]);
export type RoomStatus = (typeof RoomStatus.enumValues)[number];

export const Room = orgTable(
  "room",
  {
    name: text("name").notNull(),
    status: RoomStatus("status").notNull(),
  },
  (table) => ({
    uniqueName: unique("unique_name").on(table.name, table.orgId),
    statusIndex: index("status_idx").on(table.status),
  }),
);
export type Room = typeof Room.$inferSelect;

export const RoomSchema = v.object({
  ...OrgTableSchema.entries,
  name: v.string(),
  status: v.picklist(RoomStatus.enumValues),
});
