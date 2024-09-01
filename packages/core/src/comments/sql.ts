import { foreignKey, index, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { userRole } from "../drizzle/enums";
import { orgTable } from "../drizzle/tables";
import { orders } from "../orders/sql";
import { commentsTableName } from "./shared";

export const comments = orgTable(
  commentsTableName,
  {
    orderId: id("order_id").notNull(),
    authorId: id("author_id").notNull(),
    content: text("content").notNull(),
    visibleTo: userRole("visible_to").array().notNull(),
  },
  (table) => ({
    orderReference: foreignKey({
      columns: [table.orderId, table.orgId],
      foreignColumns: [orders.id, orders.orgId],
      name: "order_fk",
    }),
    orderIdIndex: index("order_id_idx").on(table.orderId),
    visibleToIndex: index("visible_to_idx").on(table.visibleTo),
  }),
);

export type Comment = typeof comments.$inferSelect;
