import {
  index,
  json,
  pgEnum,
  text,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { orgTable } from "../orm/tables";

import type { RoomConfiguration } from "../schemas/room-configuration";

export const RoomStatus = pgEnum("room_status", ["draft", "published"]);
export type RoomStatus = (typeof RoomStatus.enumValues)[number];

export const Room = orgTable(
  "room",
  {
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: RoomStatus("status").notNull(),
    details: text("details"),
    config: json("config").$type<RoomConfiguration>().notNull(),
  },
  (table) => ({
    uniqueName: unique("unique_name").on(table.name, table.orgId),
    statusIndex: index("status_idx").on(table.status),
  }),
);
export type Room = typeof Room.$inferSelect;
