import { foreignKey, index, text } from "drizzle-orm/pg-core";

import { Order } from "../order/order.sql";
import { id } from "../orm/columns";
import { orgTable } from "../orm/tables";
import { UserRole } from "../user";

export const Comment = orgTable(
  "comment",
  {
    orderId: id("order_id").notNull(),
    authorId: id("author_id").notNull(),
    content: text("content").notNull(),
    visibleTo: UserRole("visible_to").array().notNull(),
  },
  (table) => ({
    orderReference: foreignKey({
      columns: [table.orderId, table.orgId],
      foreignColumns: [Order.id, Order.orgId],
      name: "order_fk",
    }),
    orderIdIndex: index("order_id_idx").on(table.orderId),
    visibleToIndex: index("visible_to_idx").on(table.visibleTo),
  }),
);

export type Comment = typeof Comment.$inferSelect;
