import {
  foreignKey,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants/db";
import {
  id,
  idPrimaryKey,
  licenseStatus,
  orgStatus,
  timestamps,
} from "../drizzle/columns";
import { oAuth2Providers } from "../oauth2/sql";

export const licenses = pgTable("licenses", {
  key: uuid("key").defaultRandom().primaryKey(),
  orgId: id("org_id"),
  status: licenseStatus("status").notNull().default("active"),
});
export type License = typeof licenses.$inferSelect;

export const organizations = pgTable(
  "organizations",
  {
    ...idPrimaryKey,
    slug: varchar("slug", { length: VARCHAR_LENGTH }).notNull().unique(),
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: orgStatus("status").notNull().default("initializing"),
    licenseKey: uuid("license_key").notNull(),
    oAuth2ProviderId: text("oauth2_provider_id"),
    ...timestamps,
  },
  (table) => ({
    slugIndex: index("slug_idx").on(table.slug),
    nameIndex: index("name_idx").on(table.name),
    oauth2ProviderReference: foreignKey({
      columns: [table.oAuth2ProviderId, table.id],
      foreignColumns: [oAuth2Providers.id, oAuth2Providers.orgId],
      name: "oauth2_provider_fk",
    }),
  }),
);
export type Organization = typeof organizations.$inferSelect;
