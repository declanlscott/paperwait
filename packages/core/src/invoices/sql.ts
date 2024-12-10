import { index, jsonb, timestamp } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { invoiceStatus } from "../utils/sql";
import { invoicesTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { LineItem } from "./shared";

export const invoicesTable = tenantTable(
  invoicesTableName,
  {
    lineItems: jsonb("line_items").array().$type<Array<LineItem>>().notNull(),
    status: invoiceStatus("status").default("processing").notNull(),
    chargedAt: timestamp("charged_at", { mode: "string" }),
    orderId: id("order_id").notNull(),
  },
  (table) => [index("order_id_idx").on(table.orderId)],
);

export type InvoicesTable = typeof invoicesTable;

export type Invoice = InferSelectModel<InvoicesTable>;
