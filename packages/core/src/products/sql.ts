import { foreignKey, index, jsonb, varchar } from "drizzle-orm/pg-core";

import { Constants } from "../constants";
import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { roomsTable } from "../rooms/sql";
import { productStatus } from "../utils/sql";
import { productsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { ProductConfiguration } from "./shared";

export const productsTable = tenantTable(
  productsTableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: productStatus("status").notNull(),
    roomId: id("room_id").notNull(),
    config: jsonb("config").$type<ProductConfiguration>().notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.tenantId],
      foreignColumns: [roomsTable.id, roomsTable.tenantId],
      name: "room_fk",
    }).onDelete("cascade"),
    statusIndex: index("status_idx").on(table.status),
    roomIdIndex: index("room_id_idx").on(table.roomId),
  }),
);

export type ProductsTable = typeof productsTable;

export type Product = InferSelectModel<ProductsTable>;
