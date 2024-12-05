import { index, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { userRole } from "../utils/sql";
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
    orderIdIndex: index("order_id_idx").on(table.orderId),
    visibleToIndex: index("visible_to_idx").on(table.visibleTo),
  }),
);

export type CommentsTable = typeof commentsTable;

export type Comment = InferSelectModel<CommentsTable>;
