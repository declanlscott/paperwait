import { pgEnum, text } from "drizzle-orm/pg-core";

import { orgTable } from "../drizzle/tables";

export const roomStatus = pgEnum("room_status", ["draft", "published"]);

export const Room = orgTable("room", {
  name: text("name").notNull(),
  status: roomStatus("status").notNull(),
});
export type Room = typeof Room.$inferSelect;
