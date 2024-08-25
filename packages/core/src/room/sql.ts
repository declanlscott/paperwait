import { index, json, text, unique, varchar } from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants/db";
import { roomStatus } from "../drizzle/enums";
import { orgTable } from "../drizzle/tables";

import type { RoomConfiguration } from "../schemas/room-configuration";

export const rooms = orgTable(
  "rooms",
  {
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: roomStatus("status").notNull(),
    details: text("details"),
    config: json("config").$type<RoomConfiguration>().notNull(),
  },
  (table) => ({
    uniqueName: unique("unique_name").on(table.name, table.orgId),
    statusIndex: index("status_idx").on(table.status),
  }),
);

export type Room = typeof rooms.$inferSelect;
