import {
  boolean,
  index,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { Constants } from "../utils/constants";
import { roomStatus, workflowStatusType } from "../utils/sql";
import {
  deliveryOptionsTableName,
  roomsTableName,
  workflowStatusesTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const roomsTable = tenantTable(
  roomsTableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: roomStatus("status").notNull(),
    details: text("details"),
  },
  (table) => ({
    uniqueName: unique("unique_name").on(table.name, table.tenantId),
    statusIndex: index("status_idx").on(table.status),
  }),
);
export type RoomsTable = typeof roomsTable;
export type Room = InferSelectModel<RoomsTable>;

export const workflowStatusesTable = pgTable(
  workflowStatusesTableName,
  {
    id: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    type: workflowStatusType("type").notNull(),
    charging: boolean("charging").notNull(),
    color: varchar("color", { length: 9 }),
    index: smallint("index").notNull(),
    roomId: id("room_id").notNull(),
    tenantId: id("tenant_id").notNull(),
  },
  (table) => ({
    primary: primaryKey({
      columns: [table.id, table.roomId, table.tenantId],
    }),
    uniqueIndex: unique("unique_index").on(table.index, table.roomId),
  }),
);
export type WorkflowStatusesTable = typeof workflowStatusesTable;
export type WorkflowStatus = InferSelectModel<WorkflowStatusesTable>;

export const deliveryOptionsTable = pgTable(
  deliveryOptionsTableName,
  {
    id: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    description: varchar("description", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    detailsLabel: varchar("details_label", {
      length: Constants.VARCHAR_LENGTH,
    }),
    cost: numeric("cost"),
    index: smallint("index").notNull(),
    roomId: id("room_id").notNull(),
    tenantId: id("tenant_id").notNull(),
  },
  (table) => ({
    primary: primaryKey({
      columns: [table.id, table.roomId, table.tenantId],
    }),
  }),
);
export type DeliveryOptionsTable = typeof deliveryOptionsTable;
export type DeliveryOption = InferSelectModel<DeliveryOptionsTable>;
