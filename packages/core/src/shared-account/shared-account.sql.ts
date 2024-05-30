import { bigint, pgTable, primaryKey, text, unique } from "drizzle-orm/pg-core";

import { orgIdColumns, timestamps } from "../drizzle";

export const SharedAccount = pgTable(
  "shared_account",
  {
    id: bigint("id", { mode: "number" }).notNull(),
    orgId: orgIdColumns.orgId,
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    uniqueName: unique("unique_name").on(table.name, table.orgId),
  }),
);
export type SharedAccount = typeof SharedAccount.$inferSelect;
