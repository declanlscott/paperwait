import { pgEnum, text } from "drizzle-orm/pg-core";

import { orgTable } from "../drizzle/tables";

export const RoomStatus = pgEnum("room_status", ["draft", "published"]);
export type RoomStatus = (typeof RoomStatus.enumValues)[number];

export const Room = orgTable("room", {
  name: text("name").notNull(),
  status: RoomStatus("status").notNull(),
});
export type Room = typeof Room.$inferSelect;
