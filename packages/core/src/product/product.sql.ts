import { foreignKey, index, json, pgEnum, varchar } from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { id } from "../orm/columns";
import { orgTable } from "../orm/tables";
import { Room } from "../room/room.sql";

import type { ProductConfiguration } from "../schemas/product-configuration";

export const ProductStatus = pgEnum("product_status", ["draft", "published"]);
export type ProductStatus = (typeof ProductStatus.enumValues)[number];

export const Product = orgTable(
  "product",
  {
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: ProductStatus("status").notNull(),
    roomId: id("room_id").notNull(),
    config: json("config").$type<ProductConfiguration>().notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [Room.id, Room.orgId],
      name: "room_fk",
    }),
    statusIndex: index("status_idx").on(table.status),
    roomIdIndex: index("room_id_idx").on(table.roomId),
  }),
);

export type Product = typeof Product.$inferSelect;
