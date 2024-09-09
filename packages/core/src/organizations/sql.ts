import {
  foreignKey,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { id, idPrimaryKey, timestamps } from "../drizzle/columns";
import { licenseStatus, orgStatus } from "../drizzle/enums.sql";
import { oauth2Providers } from "../oauth2/sql";
import { licensesTableName, organizationsTableName } from "./shared";

export const licenses = pgTable(licensesTableName, {
  key: uuid("key").defaultRandom().primaryKey(),
  orgId: id("org_id"),
  status: licenseStatus("status").notNull().default("active"),
});
export type License = typeof licenses.$inferSelect;

export const organizations = pgTable(
  organizationsTableName,
  {
    ...idPrimaryKey,
    slug: varchar("slug", { length: VARCHAR_LENGTH }).notNull().unique(),
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: orgStatus("status").notNull().default("initializing"),
    licenseKey: uuid("license_key").notNull(),
    oauth2ProviderId: text("oauth2_provider_id"),
    ...timestamps,
  },
  (table) => ({
    slugIndex: index("slug_idx").on(table.slug),
    nameIndex: index("name_idx").on(table.name),
    oauth2ProviderReference: foreignKey({
      columns: [table.oauth2ProviderId, table.id],
      foreignColumns: [oauth2Providers.id, oauth2Providers.orgId],
      name: "oauth2_provider_fk",
    }),
  }),
);
export type Organization = typeof organizations.$inferSelect;
