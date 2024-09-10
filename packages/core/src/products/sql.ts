import { foreignKey, index, jsonb, varchar } from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { id } from "../drizzle/columns";
import { productStatus } from "../drizzle/enums.sql";
import { orgTable } from "../drizzle/tables";
import { roomsTable } from "../rooms/sql";
import { productsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { ProductConfiguration } from "./shared";

export const productsTable = orgTable(
  productsTableName,
  {
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: productStatus("status").notNull(),
    roomId: id("room_id").notNull(),
    config: jsonb("config").$type<ProductConfiguration>().notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [roomsTable.id, roomsTable.orgId],
      name: "room_fk",
    }),
    statusIndex: index("status_idx").on(table.status),
    roomIdIndex: index("room_id_idx").on(table.roomId),
  }),
);

export type ProductsTable = typeof productsTable;

export type Product = InferSelectModel<ProductsTable>;
