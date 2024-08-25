import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { id, oAuth2ProviderVariant, timestamps } from "../drizzle/columns";

export const oAuth2Providers = pgTable(
  "oauth2_providers",
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
