import { index, jsonb, varchar } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { Constants } from "../utils/constants";
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
  (table) => [
    index("status_idx").on(table.status),
    index("room_id_idx").on(table.roomId),
  ],
);

export type ProductsTable = typeof productsTable;

export type Product = InferSelectModel<ProductsTable>;
