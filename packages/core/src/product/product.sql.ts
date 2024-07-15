import { foreignKey, index, json, pgEnum, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { Room } from "../room/room.sql";

import type { ProductConfiguration } from "../schemas/product-configuration";

export const ProductStatus = pgEnum("product_status", ["draft", "published"]);
export type ProductStatus = (typeof ProductStatus.enumValues)[number];

export const Product = orgTable(
  "product",
  {
    name: text("name").notNull(),
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
  }),
);

export type Product = typeof Product.$inferSelect;
