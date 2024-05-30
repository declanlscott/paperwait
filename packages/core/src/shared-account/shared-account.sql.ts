import { bigint, pgTable, primaryKey, text, unique } from "drizzle-orm/pg-core";

import { id, orgIdColumns } from "../drizzle";

export const SharedAccount = pgTable(
  "shared_account",
  {
    id: bigint("id", { mode: "number" }).notNull(),
    orgId: orgIdColumns.orgId,
    name: text("name").notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    uniqueName: unique("unique_name").on(table.name, table.orgId),
  }),
);
export type SharedAccount = typeof SharedAccount.$inferSelect;

export const ManagedAccount = pgTable("managed_account", {
  managerId: id("manager_id").notNull(),
  orgId: orgIdColumns.orgId,
});
