import { index, jsonb, text, unique, varchar } from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { roomStatus } from "../drizzle/enums.sql";
import { orgTable } from "../drizzle/tables";
import { roomsTableName } from "./shared";

import type { RoomConfiguration } from "./shared";

export const rooms = orgTable(
  roomsTableName,
  {
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: roomStatus("status").notNull(),
    details: text("details"),
    config: jsonb("config").$type<RoomConfiguration>().notNull(),
  },
  (table) => ({
    uniqueName: unique("unique_name").on(table.name, table.orgId),
    statusIndex: index("status_idx").on(table.status),
  }),
);

export type Room = typeof rooms.$inferSelect;
