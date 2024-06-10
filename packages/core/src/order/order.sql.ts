import { bigint, foreignKey, index, pgEnum } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { id } from "../drizzle/columns";
import { orgTable, OrgTableSchema } from "../drizzle/tables";
import { NanoId, PapercutAccountId } from "../id";
import { PapercutAccount } from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { User } from "../user/user.sql";

export const OrderStatus = pgEnum("order_status", [
  "pending_approval",
  "new",
  "in_progress",
  "completed",
]);
export type OrderStatus = (typeof OrderStatus.enumValues)[number];

export const Order = orgTable(
  "order",
  {
    customerId: id("customer_id").notNull(),
    managerId: id("manager_id"),
    operatorId: id("operator_id"),
    productId: id("product_id").notNull(),
    papercutAccountId: bigint("papercut_account_id", {
      mode: "number",
    }).notNull(),
    status: OrderStatus("status").notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "customer_fk",
    }),
    managerId: foreignKey({
      columns: [table.managerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "manager_fk",
    }),
    operatorId: foreignKey({
      columns: [table.operatorId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "operator_fk",
    }),
    productReference: foreignKey({
      columns: [table.productId, table.orgId],
      foreignColumns: [Product.id, Product.orgId],
      name: "product_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [PapercutAccount.id, PapercutAccount.orgId],
      name: "papercut_account_fk",
    }),
    customerIdIndex: index("customer_id_idx").on(table.customerId),
    papercutAccountIdIndex: index("papercut_account_id_idx").on(
      table.papercutAccountId,
    ),
  }),
);
export type Order = typeof Order.$inferSelect;

export const OrderSchema = v.object({
  ...OrgTableSchema.entries,
  customerId: NanoId,
  managerId: v.nullable(NanoId),
  operatorId: v.nullable(NanoId),
  productId: NanoId,
  papercutAccountId: PapercutAccountId,
  status: v.picklist(OrderStatus.enumValues),
});
