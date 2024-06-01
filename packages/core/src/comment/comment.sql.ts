import { foreignKey, pgEnum, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { Order } from "../order/order.sql";

export const commentVisibility = pgEnum("comment_visibility", [
  "private",
  "public",
]);

export const Comment = orgTable(
  "comment",
  {
    orderId: id("order_id").notNull(),
    content: text("content").notNull(),
    visibility: commentVisibility("visibility").notNull(),
  },
  (table) => ({
    orderReference: foreignKey({
      columns: [table.orderId, table.orgId],
      foreignColumns: [Order.id, Order.orgId],
      name: "order_fk",
    }),
  }),
);
export type Comment = typeof Comment.$inferSelect;
