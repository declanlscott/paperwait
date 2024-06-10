import { foreignKey, index, text } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { id } from "../drizzle/columns";
import { orgTable, OrgTableSchema } from "../drizzle/tables";
import { NanoId } from "../id";
import { Order } from "../order/order.sql";
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

export const CommentSchema = v.object({
  ...OrgTableSchema.entries,
  orderId: NanoId,
  authorId: NanoId,
  content: v.string(),
  visibleTo: v.array(v.picklist(UserRole.enumValues)),
});
