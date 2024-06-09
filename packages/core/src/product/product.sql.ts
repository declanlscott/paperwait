import { foreignKey, index, pgEnum, text } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { NanoId } from "../id";
import { Room } from "../room/room.sql";

export const ProductStatus = pgEnum("product_status", ["draft", "published"]);
export type ProductStatus = (typeof ProductStatus.enumValues)[number];

// TODO: Finish implementation
export const Product = orgTable(
  "product",
  {
    name: text("name").notNull(),
    status: ProductStatus("status").notNull(),
    roomId: id("room_id").notNull(),
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

export const ProductSchema = v.object({
  id: NanoId,
  orgId: NanoId,
  name: v.string(),
  status: v.picklist(ProductStatus.enumValues),
  roomId: NanoId,
  createdAt: v.pipe(v.string(), v.isoDateTime()),
  updatedAt: v.pipe(v.string(), v.isoDateTime()),
  deletedAt: v.nullable(v.pipe(v.string(), v.isoDateTime())),
});
