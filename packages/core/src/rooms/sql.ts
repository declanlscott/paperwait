import { index, jsonb, text, unique, varchar } from "drizzle-orm/pg-core";

import { Constants } from "../constants";
import { tenantTable } from "../drizzle/tables";
import { roomStatus } from "../utils/sql";
import { roomsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { RoomConfiguration } from "./shared";

export const roomsTable = tenantTable(
  roomsTableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
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
