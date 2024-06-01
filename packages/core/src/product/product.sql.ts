import { foreignKey, pgEnum, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { Room } from "../room/room.sql";

export const productStatus = pgEnum("product_status", ["draft", "published"]);

// TODO: Finish implementation
export const Product = orgTable(
  "product",
  {
    name: text("name").notNull(),
    status: productStatus("status").notNull(),
    roomId: id("room_id").notNull(),
  },
  (table) => ({
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [Room.id, Room.orgId],
      name: "room_fk",
    }),
  }),
);
export type Product = typeof Product.$inferSelect;
