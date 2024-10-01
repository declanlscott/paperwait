import { index, jsonb, text, unique, varchar } from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { roomStatus } from "../drizzle/enums.sql";
import { tenantTable } from "../drizzle/tables";
import { roomsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { RoomConfiguration } from "./shared";

export const roomsTable = tenantTable(
  roomsTableName,
  {
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: roomStatus("status").notNull(),
    details: text("details"),
    config: jsonb("config").$type<RoomConfiguration>().notNull(),
  },
  (table) => ({
    uniqueName: unique("unique_name").on(table.name, table.tenantId),
    statusIndex: index("status_idx").on(table.status),
  }),
);

export type RoomsTable = typeof roomsTable;

export type Room = InferSelectModel<RoomsTable>;
