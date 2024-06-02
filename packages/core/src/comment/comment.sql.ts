import { foreignKey, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { Order } from "../order/order.sql";
import { UserRole } from "../user";

export const Comment = orgTable(
  "comment",
  {
    orderId: id("order_id").notNull(),
    roomId: id("room_id").notNull(),
    content: text("content").notNull(),
    visibleTo: UserRole("visible_to").array().notNull(),
  },
  (table) => ({
    orderReference: foreignKey({
      columns: [table.orderId, table.orgId],
      foreignColumns: [Order.id, Order.orgId],
      name: "order_fk",
    }),
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [Order.roomId, Order.orgId],
      name: "room_fk",
    }),
  }),
);
export type Comment = typeof Comment.$inferSelect;
