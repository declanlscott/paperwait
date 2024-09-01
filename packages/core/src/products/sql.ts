import { foreignKey, index, jsonb, varchar } from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { id } from "../drizzle/columns";
import { productStatus } from "../drizzle/enums";
import { orgTable } from "../drizzle/tables";
import { rooms } from "../rooms/sql";
import { productsTableName } from "./shared";

import type { ProductConfiguration } from "./shared";

export const products = orgTable(
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
      foreignColumns: [rooms.id, rooms.orgId],
      name: "room_fk",
    }),
    statusIndex: index("status_idx").on(table.status),
    roomIdIndex: index("room_id_idx").on(table.roomId),
  }),
);

export type Product = typeof products.$inferSelect;
