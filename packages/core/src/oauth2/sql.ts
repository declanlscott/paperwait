import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle/columns";
import { oAuth2ProviderVariant } from "../drizzle/enums.sql";
import { oAuth2ProvidersTableName } from "./shared";

export const oAuth2Providers = pgTable(
  oAuth2ProvidersTableName,
  {
    id: text("id").notNull(),
    orgId: id("org_id").notNull(),
    variant: oAuth2ProviderVariant("variant").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
  }),
);
export type OAuth2Provider = typeof oAuth2Providers.$inferSelect;
