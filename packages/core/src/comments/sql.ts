import { foreignKey, index, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { userRole } from "../drizzle/enums.sql";
import { tenantTable } from "../drizzle/tables";
import { ordersTable } from "../orders/sql";
import { commentsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const commentsTable = tenantTable(
  commentsTableName,
  {
    orderId: id("order_id").notNull(),
    authorId: id("author_id").notNull(),
    content: text("content").notNull(),
    visibleTo: userRole("visible_to").array().notNull(),
  },
  (table) => ({
    orderReference: foreignKey({
      columns: [table.orderId, table.tenantId],
      foreignColumns: [ordersTable.id, ordersTable.tenantId],
      name: "order_fk",
    }),
    orderIdIndex: index("order_id_idx").on(table.orderId),
    visibleToIndex: index("visible_to_idx").on(table.visibleTo),
  }),
);

export type CommentsTable = typeof commentsTable;

export type Comment = InferSelectModel<CommentsTable>;
