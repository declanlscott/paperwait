import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { OAuth2Provider } from "../oauth2/provider.sql";
import { id, idPrimaryKey, timestamps } from "../orm/columns";

export const LicenseStatus = pgEnum("license_status", ["active", "inactive"]);
export type LicenseStatus = (typeof LicenseStatus.enumValues)[number];

export const License = pgTable("license", {
  key: uuid("key").defaultRandom().primaryKey(),
  orgId: id("org_id"),
  status: LicenseStatus("status").notNull().default("active"),
});
export type License = typeof License.$inferSelect;

export const OrgStatus = pgEnum("org_status", [
  "initializing",
  "active",
  "suspended",
]);
export type OrgStatus = (typeof OrgStatus.enumValues)[number];

export const Organization = pgTable(
  "organization",
  {
    ...idPrimaryKey,
    slug: varchar("slug", { length: VARCHAR_LENGTH }).notNull().unique(),
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: OrgStatus("status").notNull().default("initializing"),
    licenseKey: uuid("license_key").notNull(),
    oAuth2ProviderId: text("oauth2_provider_id"),
    ...timestamps,
  },
  (table) => ({
    slugIndex: index("slug_idx").on(table.slug),
    nameIndex: index("name_idx").on(table.name),
    oauth2ProviderReference: foreignKey({
      columns: [table.oAuth2ProviderId, table.id],
      foreignColumns: [OAuth2Provider.id, OAuth2Provider.orgId],
      name: "oauth2_provider_fk",
    }),
  }),
);
export type Organization = typeof Organization.$inferSelect;
