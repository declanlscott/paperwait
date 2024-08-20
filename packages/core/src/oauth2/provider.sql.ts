import { pgEnum, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle";

export const OAuth2ProviderVariant = pgEnum("oauth2_provider_variant", [
  "entra-id",
  "google",
]);
export type OAuth2ProviderVariant =
  (typeof OAuth2ProviderVariant.enumValues)[number];

export const OAuth2Provider = pgTable(
  "oauth2_provider",
  {
    id: text("id").notNull(),
    orgId: id("org_id").notNull(),
    variant: OAuth2ProviderVariant("variant").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
  }),
);
export type OAuth2Provider = typeof OAuth2Provider.$inferSelect;
