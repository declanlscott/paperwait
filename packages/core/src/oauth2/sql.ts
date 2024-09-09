import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle/columns";
import { oauth2ProviderVariant } from "../drizzle/enums.sql";
import { oauth2ProvidersTableName } from "./shared";

export const oauth2Providers = pgTable(
  oauth2ProvidersTableName,
  {
    id: text("id").notNull(),
    orgId: id("org_id").notNull(),
    variant: oauth2ProviderVariant("variant").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
  }),
);
export type Oauth2Provider = typeof oauth2Providers.$inferSelect;
